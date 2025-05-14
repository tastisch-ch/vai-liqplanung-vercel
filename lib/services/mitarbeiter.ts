/**
 * Service for handling employees (Mitarbeiter) and salary data
 * Equivalent to logic/storage_mitarbeiter.py in the Python app
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { Mitarbeiter, LohnDaten, Buchung } from '@/models/types';
import { dateToIsoString, adjustPaymentDate } from '@/lib/date-utils/format';

/**
 * Load all employees from the database
 * @param userId Optional user ID to filter employees (not used anymore as all authenticated users can see all employees)
 */
export async function loadMitarbeiter(userId?: string): Promise<Mitarbeiter[]> {
  try {
    // Load all employees without filtering by user_id
    const { data: mitarbeiterData, error: mitarbeiterError } = await supabase
      .from('mitarbeiter')
      .select('*')
      .order('Name', { ascending: true });
  
  if (mitarbeiterError) {
      console.error('Error loading employees:', mitarbeiterError.message, mitarbeiterError.details);
      if (mitarbeiterError.code === '42P01') {
        throw new Error(`Database table 'mitarbeiter' not found. Please check your database setup.`);
      }
      throw new Error(`Failed to load employees: ${mitarbeiterError.message}`);
  }
  
  // Load all salary data
  const { data: lohnData, error: lohnError } = await supabase
    .from('lohndaten')
    .select('*');
  
  if (lohnError) {
      console.error('Error loading salary data:', lohnError.message, lohnError.details);
      if (lohnError.code === '42P01') {
        console.warn(`Database table 'lohndaten' not found. Returning employees without salary data.`);
        // Return employees without salary data rather than throwing an error
    return (mitarbeiterData || []).map(mitarbeiter => ({
      id: mitarbeiter.id,
      Name: mitarbeiter.Name,
      Lohn: [],
      user_id: mitarbeiter.user_id,
      created_at: mitarbeiter.created_at,
      updated_at: mitarbeiter.updated_at
    })) as Mitarbeiter[];
      }
  }
  
  // Group salary data by employee
  const lohnByMitarbeiter = (lohnData || []).reduce((acc: Record<string, LohnDaten[]>, lohn) => {
    const mitarbeiterId = lohn.mitarbeiter_id;
    if (!acc[mitarbeiterId]) {
      acc[mitarbeiterId] = [];
    }
    
    acc[mitarbeiterId].push({
      id: lohn.id,
      Start: new Date(lohn.Start),
      Ende: lohn.Ende ? new Date(lohn.Ende) : null,
      Betrag: lohn.Betrag
    });
    
    return acc;
  }, {});
  
  // Combine employee data with their salary data
  return (mitarbeiterData || []).map(mitarbeiter => ({
    id: mitarbeiter.id,
    Name: mitarbeiter.Name,
    Lohn: lohnByMitarbeiter[mitarbeiter.id] || [],
    user_id: mitarbeiter.user_id,
    created_at: mitarbeiter.created_at,
    updated_at: mitarbeiter.updated_at
  })) as Mitarbeiter[];
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to load employees')) {
      throw error;
    }
    console.error('Unexpected error loading employees:', error);
    throw new Error(`Failed to load employees: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Add a new employee with initial salary data
 */
export async function addMitarbeiter(
  name: string,
  lohnDaten: Omit<LohnDaten, 'id'>[],
  userId: string
): Promise<Mitarbeiter> {
  try {
  const now = new Date().toISOString();
  
  // First create the employee record
  const newMitarbeiter = {
    id: uuidv4(),
    Name: name,
    user_id: userId,
    created_at: now,
    updated_at: now
  };
  
  const { data: mitarbeiterData, error: mitarbeiterError } = await supabase
    .from('mitarbeiter')
    .insert(newMitarbeiter)
    .select()
    .single();
  
  if (mitarbeiterError) {
      console.error('Error adding employee:', mitarbeiterError.message, mitarbeiterError.details);
      if (mitarbeiterError.code === '23505') {
        throw new Error(`An employee with this name already exists`);
      } else if (mitarbeiterError.code === '42P01') {
        throw new Error(`Database table 'mitarbeiter' not found. Please check your database setup.`);
      } else if (mitarbeiterError.code === '42703') {
        throw new Error(`Database column error: ${mitarbeiterError.message}`);
      }
      throw new Error(`Failed to add employee: ${mitarbeiterError.message}`);
    }
    
    if (!mitarbeiterData) {
      throw new Error('No data returned after adding employee');
  }
  
  // Now add the salary data for this employee
  const mitarbeiterId = mitarbeiterData.id;
  const lohnInserts = lohnDaten.map(lohn => ({
    id: uuidv4(),
    mitarbeiter_id: mitarbeiterId,
    Start: dateToIsoString(lohn.Start) as string,
    Ende: lohn.Ende ? dateToIsoString(lohn.Ende) : null,
    Betrag: lohn.Betrag,
    created_at: now,
    updated_at: now
  }));
  
  if (lohnInserts.length > 0) {
    const { error: lohnError } = await supabase
      .from('lohndaten')
      .insert(lohnInserts);
    
    if (lohnError) {
        console.error('Error adding salary data:', lohnError.message, lohnError.details);
        if (lohnError.code === '42P01') {
          console.warn(`Database table 'lohndaten' not found. Employee created without salary data.`);
      // Return employee without salary data if salary insertion fails
          return {
            ...mitarbeiterData,
            Lohn: []
          } as Mitarbeiter;
        }
        // For other errors, we still created the employee but will return without salary data
      return {
        ...mitarbeiterData,
        Lohn: []
      } as Mitarbeiter;
    }
  }
  
  // Return the created employee with salary data
  return {
    ...mitarbeiterData,
    Lohn: lohnDaten.map((lohn, index) => ({
      id: lohnInserts[index].id,
      Start: lohn.Start,
      Ende: lohn.Ende,
      Betrag: lohn.Betrag
    }))
  } as Mitarbeiter;
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to add employee')) {
      throw error;
    }
    console.error('Unexpected error adding employee:', error);
    throw new Error(`Failed to add employee: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing employee
 */
export async function updateMitarbeiter(
  id: string,
  updates: Partial<Mitarbeiter>,
  userId: string
): Promise<Mitarbeiter> {
  try {
  const mitarbeiterUpdates = {
    Name: updates.Name,
    updated_at: new Date().toISOString(),
    user_id: userId
  };
  
  const { data, error } = await supabase
    .from('mitarbeiter')
    .update(mitarbeiterUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
      console.error('Error updating employee:', error.message, error.details);
      if (error.code === '23505') {
        throw new Error(`An employee with this name already exists`);
      } else if (error.code === '42P01') {
        throw new Error(`Database table 'mitarbeiter' not found`);
      }
      throw new Error(`Failed to update employee: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Employee with ID ${id} not found`);
  }
  
  // We don't update salary data here, that's handled by separate functions
  
  return {
    ...data,
    Lohn: updates.Lohn || []
  } as Mitarbeiter;
  } catch (error: any) {
    if (error.message && (error.message.includes('Failed to update employee') || error.message.includes('not found'))) {
      throw error;
    }
    console.error('Unexpected error updating employee:', error);
    throw new Error(`Failed to update employee: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete an employee and all associated salary data
 */
export async function deleteMitarbeiter(id: string): Promise<void> {
  try {
  // First delete all associated salary data
  const { error: lohnError } = await supabase
    .from('lohndaten')
    .delete()
    .eq('mitarbeiter_id', id);
  
  if (lohnError) {
      console.error('Error deleting employee salary data:', lohnError.message, lohnError.details);
      if (lohnError.code === '42P01') {
        console.warn(`Database table 'lohndaten' not found. Continuing with employee deletion.`);
      } else {
        throw new Error(`Failed to delete employee salary data: ${lohnError.message}`);
      }
  }
  
  // Then delete the employee
  const { error: mitarbeiterError } = await supabase
    .from('mitarbeiter')
    .delete()
    .eq('id', id);
  
  if (mitarbeiterError) {
      console.error('Error deleting employee:', mitarbeiterError.message, mitarbeiterError.details);
      if (mitarbeiterError.code === '42P01') {
        throw new Error(`Database table 'mitarbeiter' not found`);
      } else if (mitarbeiterError.code === '23503') {
        throw new Error(`This employee cannot be deleted because they are referenced by other records`);
      }
      throw new Error(`Failed to delete employee: ${mitarbeiterError.message}`);
    }
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to delete employee')) {
      throw error;
    }
    console.error('Unexpected error deleting employee:', error);
    throw new Error(`Failed to delete employee: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Add a new salary record to an employee
 */
export async function addLohnToMitarbeiter(
  mitarbeiterId: string,
  start: Date,
  betrag: number,
  ende: Date | null = null
): Promise<LohnDaten> {
  try {
  const now = new Date().toISOString();
  
  const newLohn = {
    id: uuidv4(),
    mitarbeiter_id: mitarbeiterId,
    Start: dateToIsoString(start) as string,
    Ende: ende ? dateToIsoString(ende) : null,
    Betrag: betrag,
    created_at: now,
    updated_at: now
  };
  
  const { data, error } = await supabase
    .from('lohndaten')
    .insert(newLohn)
    .select()
    .single();
  
  if (error) {
      console.error('Error adding salary data:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'lohndaten' not found. Please check your database setup.`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      }
      throw new Error(`Failed to add salary data: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned after adding salary data');
  }
  
  return {
    id: data.id,
    Start: new Date(data.Start),
    Ende: data.Ende ? new Date(data.Ende) : null,
    Betrag: data.Betrag
  };
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to add salary data')) {
      throw error;
    }
    console.error('Unexpected error adding salary data:', error);
    throw new Error(`Failed to add salary data: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing salary record
 */
export async function updateLohn(
  id: string,
  updates: Partial<LohnDaten>
): Promise<LohnDaten> {
  try {
  const lohnUpdates = {
    ...updates,
    Start: updates.Start ? dateToIsoString(updates.Start) : undefined,
    Ende: updates.Ende !== undefined ? dateToIsoString(updates.Ende) : undefined,
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('lohndaten')
    .update(lohnUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
      console.error('Error updating salary data:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'lohndaten' not found`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      }
      throw new Error(`Failed to update salary data: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Salary record with ID ${id} not found`);
  }
  
  return {
    id: data.id,
    Start: new Date(data.Start),
    Ende: data.Ende ? new Date(data.Ende) : null,
    Betrag: data.Betrag
  };
  } catch (error: any) {
    if (error.message && (error.message.includes('Failed to update salary data') || error.message.includes('not found'))) {
      throw error;
    }
    console.error('Unexpected error updating salary data:', error);
    throw new Error(`Failed to update salary data: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a salary record
 */
export async function deleteLohn(id: string): Promise<void> {
  try {
  const { error } = await supabase
    .from('lohndaten')
    .delete()
    .eq('id', id);
  
  if (error) {
      console.error('Error deleting salary data:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'lohndaten' not found`);
      } else if (error.code === '23503') {
        throw new Error(`This salary record cannot be deleted because it is referenced by other records`);
      }
      throw new Error(`Failed to delete salary data: ${error.message}`);
    }
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to delete salary data')) {
      throw error;
    }
    console.error('Unexpected error deleting salary data:', error);
    throw new Error(`Failed to delete salary data: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get current/active salary data for all employees
 */
export function getAktuelleLohne(mitarbeiter: Mitarbeiter[]): { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[] {
  const today = new Date();
  const result: { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[] = [];
  
  mitarbeiter.forEach(ma => {
    // Find the currently valid salary by filtering and sorting
    const activeLohne = ma.Lohn.filter(lohn => 
      lohn.Start <= today && (!lohn.Ende || lohn.Ende >= today)
    ).sort((a, b) => b.Start.getTime() - a.Start.getTime());
    
    // If there's an active salary, add it to the result
    if (activeLohne.length > 0) {
      result.push({
        mitarbeiter: ma,
        lohn: activeLohne[0]
      });
    }
  });
  
  return result;
}

/**
 * Convert salary data to transactions for a given date range
 * Each employee salary creates monthly transactions on the 25th
 */
export function convertLohneToBuchungen(
  startDate: Date,
  endDate: Date,
  mitarbeiter: Mitarbeiter[]
): Buchung[] {
  const result: Buchung[] = [];
  
  // Get all active salaries
  const aktuelleLohne = getAktuelleLohne(mitarbeiter);
  
  // For each month in the date range, create salary transactions
  let currentMonthDate = new Date(startDate);
  currentMonthDate.setDate(1); // Start from the first day of the month
  
  while (currentMonthDate <= endDate) {
    const paymentDate = new Date(currentMonthDate);
    paymentDate.setDate(25); // Salary payment on the 25th
    
    // Apply weekend adjustment - move to Friday if on weekend
    // This ensures salary payments are never scheduled for weekends
    const adjustedPaymentDate = adjustPaymentDate(paymentDate, false);
    
    // Only process if the payment date is within our range
    if (adjustedPaymentDate >= startDate && adjustedPaymentDate <= endDate) {
      // For each employee with an active salary
      aktuelleLohne.forEach(({ mitarbeiter, lohn }) => {
        // Check if the salary is valid for this month
        if (lohn.Start <= adjustedPaymentDate && (!lohn.Ende || lohn.Ende >= adjustedPaymentDate)) {
          // Create a transaction for this salary payment
          const buchung: Buchung = {
            id: uuidv4(),
            date: adjustedPaymentDate,
            details: `Lohn: ${mitarbeiter.Name}`,
            amount: lohn.Betrag,
            direction: 'Outgoing',
            kategorie: 'Lohn',
            user_id: mitarbeiter.user_id,
            created_at: new Date().toISOString()
          };
          
          result.push(buchung);
        }
      });
    }
    
    // Move to the next month
    currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
  }
  
  // Sort by date
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
} 