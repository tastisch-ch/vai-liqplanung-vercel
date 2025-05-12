/**
 * Service for handling employees (Mitarbeiter) and salary data
 * Equivalent to logic/storage_mitarbeiter.py in the Python app
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { Mitarbeiter, LohnDaten, Buchung } from '@/models/types';
import { dateToIsoString } from '@/lib/date-utils/format';

/**
 * Load all employees from the database
 * @param userId Optional user ID to filter employees
 */
export async function loadMitarbeiter(userId?: string): Promise<Mitarbeiter[]> {
  // First, load all employees
  let query = supabase.from('mitarbeiter').select('*');
  
  // Filter by user if specified
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data: mitarbeiterData, error: mitarbeiterError } = await query.order('Name', { ascending: true });
  
  if (mitarbeiterError) {
    console.error('Error loading employees:', mitarbeiterError.message);
    throw new Error(`Failed to load employees: ${mitarbeiterError.message}`);
  }
  
  // Load all salary data
  const { data: lohnData, error: lohnError } = await supabase
    .from('lohndaten')
    .select('*');
  
  if (lohnError) {
    console.error('Error loading salary data:', lohnError.message);
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
}

/**
 * Add a new employee with initial salary data
 */
export async function addMitarbeiter(
  name: string,
  lohnDaten: Omit<LohnDaten, 'id'>[],
  userId: string
): Promise<Mitarbeiter> {
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
    console.error('Error adding employee:', mitarbeiterError.message);
    throw new Error(`Failed to add employee: ${mitarbeiterError.message}`);
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
      console.error('Error adding salary data:', lohnError.message);
      // Return employee without salary data if salary insertion fails
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
}

/**
 * Update an existing employee
 */
export async function updateMitarbeiter(
  id: string,
  updates: Partial<Mitarbeiter>,
  userId: string
): Promise<Mitarbeiter> {
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
    console.error('Error updating employee:', error.message);
    throw new Error(`Failed to update employee: ${error.message}`);
  }
  
  // We don't update salary data here, that's handled by separate functions
  
  return {
    ...data,
    Lohn: updates.Lohn || []
  } as Mitarbeiter;
}

/**
 * Delete an employee and all associated salary data
 */
export async function deleteMitarbeiter(id: string): Promise<void> {
  // First delete all associated salary data
  const { error: lohnError } = await supabase
    .from('lohndaten')
    .delete()
    .eq('mitarbeiter_id', id);
  
  if (lohnError) {
    console.error('Error deleting employee salary data:', lohnError.message);
    throw new Error(`Failed to delete employee salary data: ${lohnError.message}`);
  }
  
  // Then delete the employee
  const { error: mitarbeiterError } = await supabase
    .from('mitarbeiter')
    .delete()
    .eq('id', id);
    
  if (mitarbeiterError) {
    console.error('Error deleting employee:', mitarbeiterError.message);
    throw new Error(`Failed to delete employee: ${mitarbeiterError.message}`);
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
    return {
      id: newLohn.id,
      Start: new Date(newLohn.Start),
      Ende: newLohn.Ende ? new Date(newLohn.Ende) : null,
      Betrag: newLohn.Betrag
    };
  }
  
  return {
    id: data.id,
    Start: new Date(data.Start),
    Ende: data.Ende ? new Date(data.Ende) : null,
    Betrag: data.Betrag
  };
}

/**
 * Update an existing salary record
 */
export async function updateLohn(
  id: string,
  updates: Partial<LohnDaten>
): Promise<LohnDaten> {
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
    return {
      id,
      Start: lohnUpdates.Start ? new Date(lohnUpdates.Start as string) : new Date(),
      Ende: lohnUpdates.Ende ? 
        (lohnUpdates.Ende === null ? null : new Date(lohnUpdates.Ende as string)) 
        : null,
      Betrag: lohnUpdates.Betrag || 0
    };
  }
  
  return {
    id: data.id,
    Start: new Date(data.Start),
    Ende: data.Ende ? new Date(data.Ende) : null,
    Betrag: data.Betrag
  };
}

/**
 * Delete a salary record
 */
export async function deleteLohn(id: string): Promise<void> {
  const { error } = await supabase
    .from('lohndaten')
    .delete()
    .eq('id', id);
  
  if (error) {
    return;
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
    
    // Only process if the payment date is within our range
    if (paymentDate >= startDate && paymentDate <= endDate) {
      // For each employee with an active salary
      aktuelleLohne.forEach(({ mitarbeiter, lohn }) => {
        // Check if the salary is valid for this month
        if (lohn.Start <= paymentDate && (!lohn.Ende || lohn.Ende >= paymentDate)) {
          // Create a transaction for this salary payment
          const buchung: Buchung = {
            id: uuidv4(),
            date: paymentDate,
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