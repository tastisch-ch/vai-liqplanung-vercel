/**
 * Service for handling fixed costs (Fixkosten) in the application
 * Equivalent to logic/storage_fixkosten.py in the Python app
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { Fixkosten, Buchung } from '@/models/types';
import { dateToIsoString, getNextOccurrence } from '@/lib/date-utils/format';

/**
 * Load all fixed costs from the database
 * @param userId Optional user ID to filter fixed costs
 */
export async function loadFixkosten(userId?: string): Promise<Fixkosten[]> {
  try {
    let query = supabase.from('fixkosten').select('*');
    
    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) {
      console.error('Error loading fixkosten:', error.message, error.details);
      throw new Error(`Failed to load fixed costs: ${error.message}`);
    }
    
    return (data || []).map(item => ({
      ...item,
      start: new Date(item.start),
      enddatum: item.enddatum ? new Date(item.enddatum) : null,
    })) as Fixkosten[];
  } catch (error: any) {
    console.error('Unexpected error loading fixkosten:', error);
    throw new Error(`Failed to load fixed costs: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Add a new fixed cost
 */
export async function addFixkosten(
  name: string,
  betrag: number,
  rhythmus: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich',
  start: Date,
  enddatum: Date | null,
  userId: string
): Promise<Fixkosten> {
  try {
    const now = new Date().toISOString();
    const newFixkosten = {
      id: uuidv4(),
      name,
      betrag,
      rhythmus,
      start: dateToIsoString(start) as string,
      enddatum: dateToIsoString(enddatum),
      user_id: userId,
      created_at: now,
      updated_at: now
    };
    
    const { data, error } = await supabase
      .from('fixkosten')
      .insert(newFixkosten)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding fixkosten:', error.message, error.details);
      if (error.code === '23505') {
        throw new Error(`A fixed cost with this name already exists`);
      } else if (error.code === '42P01') {
        throw new Error(`Database table 'fixkosten' not found. Please check your database setup.`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      }
      throw new Error(`Failed to add fixed cost: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned after adding fixed cost');
    }
    
    return {
      ...data,
      start: new Date(data.start),
      enddatum: data.enddatum ? new Date(data.enddatum) : null,
    } as Fixkosten;
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to add fixed cost')) {
      throw error;
    }
    console.error('Unexpected error adding fixkosten:', error);
    throw new Error(`Failed to add fixed cost: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing fixed cost by ID
 */
export async function updateFixkostenById(
  id: string,
  updates: Partial<Fixkosten>,
  userId: string
): Promise<Fixkosten> {
  try {
    // Ensure dates are formatted correctly
    const formattedUpdates = {
      ...updates,
      start: updates.start ? dateToIsoString(updates.start) : undefined,
      enddatum: updates.enddatum !== undefined ? dateToIsoString(updates.enddatum) : undefined,
      updated_at: new Date().toISOString(),
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('fixkosten')
      .update(formattedUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating fixkosten:', error.message, error.details);
      if (error.code === '23505') {
        throw new Error(`A fixed cost with this name already exists`);
      } else if (error.code === '42P01') {
        throw new Error(`Database table 'fixkosten' not found`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      }
      throw new Error(`Failed to update fixed cost: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Fixed cost with ID ${id} not found`);
    }
    
    return {
      ...data,
      start: new Date(data.start),
      enddatum: data.enddatum ? new Date(data.enddatum) : null,
    } as Fixkosten;
  } catch (error: any) {
    if (error.message && (error.message.includes('Failed to update fixed cost') || error.message.includes('not found'))) {
      throw error;
    }
    console.error('Unexpected error updating fixkosten:', error);
    throw new Error(`Failed to update fixed cost: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a fixed cost by ID
 */
export async function deleteFixkostenById(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('fixkosten')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting fixkosten:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'fixkosten' not found`);
      } else if (error.code === '23503') {
        throw new Error(`This fixed cost cannot be deleted because it is referenced by other records`);
      }
      throw new Error(`Failed to delete fixed cost: ${error.message}`);
    }
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to delete fixed cost')) {
      throw error;
    }
    console.error('Unexpected error deleting fixkosten:', error);
    throw new Error(`Failed to delete fixed cost: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Calculate monthly costs from all active fixed costs
 * Similar to the calculate_monthly_costs function in the Python app
 */
export function calculateMonthlyCosts(fixkosten: Fixkosten[]): number {
  const today = new Date();
  
  // Filter active fixed costs
  const activeFixkosten = fixkosten.filter(item => 
    !item.enddatum || item.enddatum > today
  );
  
  // Calculate monthly equivalent for each fixed cost
  return activeFixkosten.reduce((total, item) => {
    let monthlyAmount = 0;
    
    switch (item.rhythmus) {
      case 'monatlich':
        monthlyAmount = item.betrag;
        break;
      case 'quartalsweise':
        monthlyAmount = item.betrag / 3;
        break;
      case 'halbjährlich':
        monthlyAmount = item.betrag / 6;
        break;
      case 'jährlich':
        monthlyAmount = item.betrag / 12;
        break;
      default:
        monthlyAmount = item.betrag;
    }
    
    return total + monthlyAmount;
  }, 0);
}

/**
 * Convert fixed costs to transactions for a given date range
 * Similar to convert_fixkosten_to_buchungen in the Python app
 */
export function convertFixkostenToBuchungen(
  startDate: Date, 
  endDate: Date, 
  fixkosten: Fixkosten[]
): Buchung[] {
  const result: Buchung[] = [];
  
  // For each fixed cost, generate transactions within the date range
  fixkosten.forEach(fixkosten => {
    let currentDate = new Date(Math.max(fixkosten.start.getTime(), startDate.getTime()));
    
    // If fixed cost already ended before the start date, skip
    if (fixkosten.enddatum && fixkosten.enddatum < startDate) {
      return;
    }
    
    // Generate occurrences until end date
    while (currentDate <= endDate) {
      // If we've passed the end date of this fixed cost, stop
      if (fixkosten.enddatum && currentDate > fixkosten.enddatum) {
        break;
      }
      
      // Create a transaction for this occurrence
      const buchung: Buchung = {
        id: uuidv4(),
        date: new Date(currentDate),
        details: fixkosten.name,
        amount: fixkosten.betrag,
        direction: 'Outgoing',
        kategorie: 'Fixkosten',
        user_id: fixkosten.user_id,
        created_at: new Date().toISOString()
      };
      
      result.push(buchung);
      
      // Get the next occurrence date
      currentDate = getNextOccurrence(currentDate, fixkosten.rhythmus);
    }
  });
  
  // Sort by date
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Generate projections for fixed costs over a specified date range
 */
export function generateFixkostenProjections(
  fixkosten: Fixkosten[],
  startDate: Date,
  endDate: Date
): Array<Fixkosten & { date: Date }> {
  const projections: Array<Fixkosten & { date: Date }> = [];
  
  // Filter active fixed costs
  const activeFixkosten = filterActiveFixkosten(fixkosten);
  
  // For each fixed cost, generate occurrences within the date range
  activeFixkosten.forEach(fixkost => {
    let currentDate = new Date(Math.max(fixkost.start.getTime(), startDate.getTime()));
    
    // Generate occurrences until end date
    while (currentDate <= endDate) {
      // If we've passed the end date of this fixed cost, stop
      if (fixkost.enddatum && currentDate > fixkost.enddatum) {
        break;
      }
      
      // Add this occurrence
      projections.push({
        ...fixkost,
        date: new Date(currentDate)
      });
      
      // Get the next occurrence date
      currentDate = getNextOccurrence(currentDate, fixkost.rhythmus);
    }
  });
  
  // Sort by date
  return projections.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Filter fixed costs by active status
 */
export function filterActiveFixkosten(fixkosten: Fixkosten[], onlyActive: boolean = true): Fixkosten[] {
  if (!onlyActive) return fixkosten;
  
  const today = new Date();
  return fixkosten.filter(item => !item.enddatum || item.enddatum > today);
}

/**
 * Check if a fixed cost is active (not ended)
 */
export function isFixkostenActive(fixkosten: Fixkosten): boolean {
  const today = new Date();
  return !fixkosten.enddatum || fixkosten.enddatum > today;
} 