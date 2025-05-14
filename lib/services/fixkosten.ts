/**
 * Service for handling fixed costs (Fixkosten) in the application
 * Equivalent to logic/storage_fixkosten.py in the Python app
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { Fixkosten, Buchung } from '@/models/types';
import { dateToIsoString, getNextOccurrence, adjustPaymentDate } from '@/lib/date-utils/format';

/**
 * Load all fixed costs from the database
 * All users can see all fixed costs
 */
export async function loadFixkosten(userId?: string): Promise<Fixkosten[]> {
  try {
    let query = supabase.from('fixkosten').select('*');
    
    // No longer filtering by user_id
    // All users see all fixed costs
    
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
  userId: string,
  kategorie: string = 'Allgemein'
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
      // Still store the creator's user_id for reference, but won't filter by it
      user_id: userId,
      kategorie,
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
    };
    
    // Remove user_id from updates to preserve the original creator
    if ('user_id' in formattedUpdates) {
      delete formattedUpdates.user_id;
    }
    
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
      
      // Check if the original date is at the end of the month (e.g., 30th, 31st)
      const originalDate = new Date(fixkosten.start);
      const originalDay = originalDate.getDate();
      const lastDayOfOriginalMonth = new Date(originalDate.getFullYear(), originalDate.getMonth() + 1, 0).getDate();
      // More robust end-of-month detection:
      // 1. If it's exactly the last day of the month, or
      // 2. If it's day 30 or 31 (which are commonly used to mean "end of month")
      const isMonthEnd = originalDay === lastDayOfOriginalMonth || originalDay >= 30;
      
      // Adjust the payment date for weekends and month-end cases
      // Always move weekend dates to previous Friday for better business practice
      const adjustedDate = adjustPaymentDate(new Date(currentDate), isMonthEnd, true);
      
      // Create transaction
      result.push({
        id: `fixkosten_${fixkosten.id}_${currentDate.toISOString()}`,
        date: adjustedDate,
        details: fixkosten.name,
        amount: fixkosten.betrag,
        direction: 'Outgoing',
        user_id: fixkosten.user_id,
        kategorie: fixkosten.kategorie || 'Fixkosten',
        created_at: fixkosten.created_at,
        // Add a flag to indicate if the date was shifted due to weekend or month-end
        shifted: adjustedDate.getTime() !== currentDate.getTime()
      });
      
      // Get next occurrence based on rhythm
      currentDate = getNextOccurrence(currentDate, fixkosten.rhythmus);
    }
  });
  
  // Sort transactions by date
  result.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return result;
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
    
    // Check if the original date is at the end of the month (e.g., 30th, 31st)
    const originalDate = new Date(fixkost.start);
    const originalDay = originalDate.getDate();
    const lastDayOfOriginalMonth = new Date(originalDate.getFullYear(), originalDate.getMonth() + 1, 0).getDate();
    // More robust end-of-month detection:
    // 1. If it's exactly the last day of the month, or
    // 2. If it's day 30 or 31 (which are commonly used to mean "end of month")
    const isMonthEnd = originalDay === lastDayOfOriginalMonth || originalDay >= 30;
    
    // Generate occurrences until end date
    while (currentDate <= endDate) {
      // If we've passed the end date of this fixed cost, stop
      if (fixkost.enddatum && currentDate > fixkost.enddatum) {
        break;
      }
      
      // Check if the original date is at the end of the month (e.g., 30th, 31st)
      const originalDate = new Date(fixkost.start);
      const originalDay = originalDate.getDate();
      const lastDayOfOriginalMonth = new Date(originalDate.getFullYear(), originalDate.getMonth() + 1, 0).getDate();
      // More robust end-of-month detection:
      // 1. If it's exactly the last day of the month, or
      // 2. If it's day 30 or 31 (which are commonly used to mean "end of month")
      const isMonthEnd = originalDay === lastDayOfOriginalMonth || originalDay >= 30;
      
      // Adjust the payment date for weekends and month-end cases
      // Always move weekend dates to previous Friday for better business practice
      const adjustedDate = adjustPaymentDate(new Date(currentDate), isMonthEnd, true);
      
      // Add this occurrence
      projections.push({
        ...fixkost,
        date: adjustedDate
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

/**
 * Get all available fixkosten categories
 */
export async function getFixkostenCategories(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('fixkosten')
      .select('kategorie')
      // No longer filtering by user_id
      .order('kategorie');
      
    if (error) {
      console.error('Error loading fixkosten categories:', error);
      return ['Allgemein'];
    }
    
    // Extract unique categories
    const categories = data
      .map(item => item.kategorie || 'Allgemein')
      .filter((value, index, self) => self.indexOf(value) === index);
    
    // Always include "Allgemein" if it doesn't exist
    if (!categories.includes('Allgemein')) {
      categories.push('Allgemein');
    }
    
    return categories.sort();
  } catch (error) {
    console.error('Unexpected error loading fixkosten categories:', error);
    return ['Allgemein'];
  }
}

/**
 * Filter fixkosten by category
 */
export function filterFixkostenByCategory(fixkosten: Fixkosten[], category?: string): Fixkosten[] {
  if (!category || category === 'Alle') {
    return fixkosten;
  }
  
  return fixkosten.filter(item => item.kategorie === category);
} 