/**
 * Service for handling fixkosten overrides (exceptions to fixed costs)
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { FixkostenOverride } from '@/models/types';
import { dateToIsoString } from '@/lib/date-utils/format';
import { loadFixkosten, convertFixkostenToBuchungen } from './fixkosten';

/**
 * Load all fixkosten overrides from the database
 * @param userId - Current user ID
 */
export async function loadFixkostenOverrides(userId: string): Promise<FixkostenOverride[]> {
  try {
    // All authenticated users can see all overrides (see RLS policy)
    const { data, error } = await supabase
      .from('fixkosten_overrides')
      .select('*')
      .order('original_date', { ascending: true });
    
    if (error) {
      console.error('Error loading fixkosten overrides:', error.message, error.details);
      throw new Error(`Failed to load fixkosten overrides: ${error.message}`);
    }
    
    return (data || []).map(item => ({
      ...item,
      original_date: new Date(item.original_date),
      new_date: item.new_date ? new Date(item.new_date) : null,
    })) as FixkostenOverride[];
  } catch (error: any) {
    console.error('Unexpected error loading fixkosten overrides:', error);
    throw new Error(`Failed to load fixkosten overrides: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Load fixkosten overrides for a specific fixkosten
 * @param fixkostenId - ID of the fixkosten
 */
export async function loadOverridesForFixkosten(fixkostenId: string): Promise<FixkostenOverride[]> {
  try {
    const { data, error } = await supabase
      .from('fixkosten_overrides')
      .select('*')
      .eq('fixkosten_id', fixkostenId)
      .order('original_date', { ascending: true });
    
    if (error) {
      console.error('Error loading fixkosten overrides:', error.message, error.details);
      throw new Error(`Failed to load fixkosten overrides: ${error.message}`);
    }
    
    return (data || []).map(item => ({
      ...item,
      original_date: new Date(item.original_date),
      new_date: item.new_date ? new Date(item.new_date) : null,
    })) as FixkostenOverride[];
  } catch (error: any) {
    console.error('Unexpected error loading fixkosten overrides:', error);
    throw new Error(`Failed to load fixkosten overrides: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Add a new fixkosten override
 */
export async function addFixkostenOverride(
  fixkostenId: string,
  originalDate: Date,
  newDate: Date | null,
  newAmount: number | null,
  isSkipped: boolean,
  notes: string | null,
  userId: string
): Promise<FixkostenOverride> {
  try {
    const now = new Date().toISOString();
    
    // At least one override type must be set
    if (!newDate && newAmount === null && !isSkipped) {
      throw new Error('At least one override (new date, new amount, or skip) must be specified');
    }
    
    // Normalize dates to start of day for comparison
    const normalizedOriginalDate = new Date(originalDate);
    normalizedOriginalDate.setHours(0, 0, 0, 0);
    
    let normalizedNewDate = null;
    if (newDate) {
      normalizedNewDate = new Date(newDate);
      normalizedNewDate.setHours(0, 0, 0, 0);
    }
    
    const newOverride = {
      id: uuidv4(),
      fixkosten_id: fixkostenId,
      original_date: dateToIsoString(normalizedOriginalDate) as string,
      new_date: normalizedNewDate ? dateToIsoString(normalizedNewDate) : null,
      new_amount: newAmount,
      is_skipped: isSkipped,
      notes,
      user_id: userId,
      created_at: now,
      updated_at: now
    };
    
    // Check for existing override first
    const { data: existingOverride, error: checkError } = await supabase
      .from('fixkosten_overrides')
      .select()
      .eq('fixkosten_id', fixkostenId)
      .eq('original_date', newOverride.original_date)
      .maybeSingle();
      
    if (checkError) {
      throw new Error(`Failed to check for existing override: ${checkError.message}`);
    }
    
    if (existingOverride) {
      throw new Error('An override for this fixed cost on this date already exists');
    }
    
    const { data, error } = await supabase
      .from('fixkosten_overrides')
      .insert(newOverride)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding fixkosten override:', error.message, error.details);
      if (error.code === '23505') {
        throw new Error(`An override for this fixed cost on this date already exists`);
      } else if (error.code === '42P01') {
        throw new Error(`Database table 'fixkosten_overrides' not found. Please check your database setup.`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      }
      throw new Error(`Failed to add fixkosten override: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned after adding fixkosten override');
    }
    
    return {
      ...data,
      original_date: new Date(data.original_date),
      new_date: data.new_date ? new Date(data.new_date) : null,
    } as FixkostenOverride;
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to add fixkosten override')) {
      throw error;
    }
    console.error('Unexpected error adding fixkosten override:', error);
    throw new Error(`Failed to add fixkosten override: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing fixkosten override by ID
 */
export async function updateFixkostenOverrideById(
  id: string,
  updates: Partial<FixkostenOverride>,
  userId: string
): Promise<FixkostenOverride> {
  try {
    // Normalize dates to start of day for comparison
    let normalizedOriginalDate = undefined;
    if (updates.original_date) {
      normalizedOriginalDate = new Date(updates.original_date);
      normalizedOriginalDate.setHours(0, 0, 0, 0);
    }
    
    let normalizedNewDate = undefined;
    if (updates.new_date !== undefined) {
      if (updates.new_date) {
        normalizedNewDate = new Date(updates.new_date);
        normalizedNewDate.setHours(0, 0, 0, 0);
      } else {
        normalizedNewDate = null;
      }
    }
    
    // Ensure dates are formatted correctly
    const formattedUpdates = {
      ...updates,
      original_date: normalizedOriginalDate ? dateToIsoString(normalizedOriginalDate) : undefined,
      new_date: normalizedNewDate !== undefined ? (normalizedNewDate ? dateToIsoString(normalizedNewDate) : null) : undefined,
      updated_at: new Date().toISOString(),
    };
    
    // Remove user_id from updates to preserve the original creator
    if ('user_id' in formattedUpdates) {
      delete formattedUpdates.user_id;
    }
    
    // Cannot update the fixkosten_id (would break the override relationship)
    if ('fixkosten_id' in formattedUpdates) {
      delete formattedUpdates.fixkosten_id;
    }
    
    // Get the current override to check for date conflicts
    const { data: currentOverride, error: getError } = await supabase
      .from('fixkosten_overrides')
      .select()
      .eq('id', id)
      .single();
      
    if (getError) {
      throw new Error(`Failed to get current override: ${getError.message}`);
    }
    
    if (!currentOverride) {
      throw new Error(`Fixkosten override with ID ${id} not found`);
    }
    
    // If changing the date, check for conflicts
    if (normalizedNewDate) {
      const { data: existingOverride, error: checkError } = await supabase
        .from('fixkosten_overrides')
        .select()
        .eq('fixkosten_id', currentOverride.fixkosten_id)
        .eq('original_date', normalizedNewDate.toISOString())
        .neq('id', id)
        .maybeSingle();
        
      if (checkError) {
        throw new Error(`Failed to check for existing override: ${checkError.message}`);
      }
      
      if (existingOverride) {
        throw new Error('An override for this fixed cost on this date already exists');
      }
    }
    
    const { data, error } = await supabase
      .from('fixkosten_overrides')
      .update(formattedUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating fixkosten override:', error.message, error.details);
      if (error.code === '23505') {
        throw new Error(`An override for this fixed cost on this date already exists`);
      } else if (error.code === '42P01') {
        throw new Error(`Database table 'fixkosten_overrides' not found`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      }
      throw new Error(`Failed to update fixkosten override: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Fixkosten override with ID ${id} not found`);
    }
    
    return {
      ...data,
      original_date: new Date(data.original_date),
      new_date: data.new_date ? new Date(data.new_date) : null,
    } as FixkostenOverride;
  } catch (error: any) {
    if (error.message && (error.message.includes('Failed to update fixkosten override') || error.message.includes('not found'))) {
      throw error;
    }
    console.error('Unexpected error updating fixkosten override:', error);
    throw new Error(`Failed to update fixkosten override: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a fixkosten override by ID
 */
export async function deleteFixkostenOverrideById(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('fixkosten_overrides')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting fixkosten override:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'fixkosten_overrides' not found`);
      }
      throw new Error(`Failed to delete fixkosten override: ${error.message}`);
    }
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to delete fixkosten override')) {
      throw error;
    }
    console.error('Unexpected error deleting fixkosten override:', error);
    throw new Error(`Failed to delete fixkosten override: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Find any overrides for a specific fixkosten on a specific date
 */
export function findOverrideForDate(
  overrides: FixkostenOverride[], 
  fixkostenId: string, 
  date: Date
): FixkostenOverride | null {
  // Find an override matching the fixkosten_id and original_date
  return overrides.find(override => 
    override.fixkosten_id === fixkostenId && 
    override.original_date.getTime() === new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  ) || null;
}

/**
 * Check if there are any overrides for a date range
 */
export function hasOverridesInDateRange(
  overrides: FixkostenOverride[],
  startDate: Date,
  endDate: Date
): boolean {
  return overrides.some(override => 
    override.original_date >= startDate && override.original_date <= endDate
  );
}

/**
 * Match a Buchung (transaction) to a Fixkosten transaction and create an override to skip it
 * This is used when a transaction from E-Banking import matches a fixed cost transaction
 * 
 * @param buchung - The imported transaction to match
 * @param userId - Current user ID
 * @returns The created override, or null if no match was found
 */
export async function matchBuchungToFixkosten(
  buchung: {
    date: Date;
    amount: number;
    details: string;
    direction: 'Incoming' | 'Outgoing';
  },
  userId: string
): Promise<FixkostenOverride | null> {
  try {
    // Only match outgoing transactions (Fixkosten are always outgoing)
    if (buchung.direction !== 'Outgoing') {
      return null;
    }

    // Load all fixkosten
    const fixkosten = await loadFixkosten(userId);
    
    // Load existing overrides to avoid duplicates
    const existingOverrides = await loadFixkostenOverrides(userId);
    
    // Normalize buchung details for comparison
    const normalizeText = (text: string) => 
      text.toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[^\w\s]/g, '');
    
    const buchungNormalized = normalizeText(buchung.details);
    
    // Check date range: look for fixkosten transactions within ±7 days
    const dateRangeStart = new Date(buchung.date);
    dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    const dateRangeEnd = new Date(buchung.date);
    dateRangeEnd.setDate(dateRangeEnd.getDate() + 7);
    
    // Generate fixkosten transactions for the date range
    const fixkostenTransactions = convertFixkostenToBuchungen(
      dateRangeStart,
      dateRangeEnd,
      fixkosten,
      existingOverrides
    );
    
    // Find matching fixkosten transaction
    for (const fixkostenTx of fixkostenTransactions) {
      // Check amount match (within 1% tolerance)
      const amountDiff = Math.abs(fixkostenTx.amount - buchung.amount);
      const amountTolerance = buchung.amount * 0.01;
      
      if (amountDiff > amountTolerance) {
        continue;
      }
      
      // Check date match (within ±7 days)
      const dateDiff = Math.abs(fixkostenTx.date.getTime() - buchung.date.getTime());
      const maxDateDiff = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      
      if (dateDiff > maxDateDiff) {
        continue;
      }
      
      // Check text similarity (fuzzy match)
      const fixkostenNormalized = normalizeText(fixkostenTx.details);
      
      // Simple similarity check: check if significant words match
      const buchungWords = buchungNormalized.split(/\s+/).filter(w => w.length > 3);
      const fixkostenWords = fixkostenNormalized.split(/\s+/).filter(w => w.length > 3);
      
      // Count matching words
      const matchingWords = buchungWords.filter(word => 
        fixkostenWords.some(fw => fw.includes(word) || word.includes(fw))
      );
      
      // Require at least 1 matching significant word OR exact normalized match
      const hasTextMatch = matchingWords.length > 0 || buchungNormalized === fixkostenNormalized;
      
      if (!hasTextMatch) {
        continue;
      }
      
      // Found a match! Extract fixkosten ID from transaction ID
      // Transaction ID format: `fixkosten_${fixkosten.id}_${date}`
      const match = fixkostenTx.id.match(/^fixkosten_(.+?)_/);
      if (!match) {
        continue;
      }
      
      const fixkostenId = match[1];
      const originalDate = fixkostenTx.date;
      
      // Check if override already exists
      const existingOverride = findOverrideForDate(existingOverrides, fixkostenId, originalDate);
      if (existingOverride) {
        // Override already exists, skip
        return null;
      }
      
      // Create override to skip this fixkosten occurrence
      const override = await addFixkostenOverride(
        fixkostenId,
        originalDate,
        null, // newDate
        null, // newAmount
        true, // isSkipped
        `Automatisch übersprungen: Deckungsgleich mit importierter Buchung "${buchung.details}"`,
        userId
      );
      
      console.log(`Created skip override for fixkosten ${fixkostenId} on ${originalDate.toISOString()} matching buchung "${buchung.details}"`);
      
      return override;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error matching buchung to fixkosten:', error);
    // Don't throw - this is a non-critical operation
    return null;
  }
} 