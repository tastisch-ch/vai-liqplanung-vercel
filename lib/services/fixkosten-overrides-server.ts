/**
 * Server-side version of fixkosten-overrides functions
 * Uses Supabase server client instead of client-side client
 */

import { v4 as uuidv4 } from 'uuid';
import { FixkostenOverride } from '@/models/types';
import { dateToIsoString } from '@/lib/date-utils/format';
import { SupabaseClient } from '@supabase/supabase-js';
import { convertFixkostenToBuchungen } from './fixkosten';
import { findOverrideForDate } from './fixkosten-overrides';

/**
 * Load all fixkosten from database using server client
 */
async function loadFixkostenServer(supabase: SupabaseClient): Promise<any[]> {
  const { data, error } = await supabase
    .from('fixkosten')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error loading fixkosten:', error.message);
    throw new Error(`Failed to load fixed costs: ${error.message}`);
  }
  
  return (data || []).map(item => ({
    ...item,
    start: new Date(item.start),
    enddatum: item.enddatum ? new Date(item.enddatum) : null,
  }));
}

/**
 * Load all fixkosten overrides from database using server client
 */
async function loadFixkostenOverridesServer(supabase: SupabaseClient): Promise<FixkostenOverride[]> {
  const { data, error } = await supabase
    .from('fixkosten_overrides')
    .select('*')
    .order('original_date', { ascending: true });
  
  if (error) {
    console.error('Error loading fixkosten overrides:', error.message);
    throw new Error(`Failed to load fixkosten overrides: ${error.message}`);
  }
  
  return (data || []).map(item => ({
    ...item,
    original_date: new Date(item.original_date),
    new_date: item.new_date ? new Date(item.new_date) : null,
  })) as FixkostenOverride[];
}

/**
 * Add a fixkosten override using server client
 */
async function addFixkostenOverrideServer(
  fixkostenId: string,
  originalDate: Date,
  newDate: Date | null,
  newAmount: number | null,
  isSkipped: boolean,
  notes: string | null,
  userId: string,
  supabase: SupabaseClient
): Promise<FixkostenOverride> {
  const now = new Date().toISOString();
  
  // Normalize dates to start of day for comparison
  const normalizedOriginalDate = new Date(originalDate);
  normalizedOriginalDate.setHours(0, 0, 0, 0);
  
  let normalizedNewDate = null;
  if (newDate) {
    normalizedNewDate = new Date(newDate);
    normalizedNewDate.setHours(0, 0, 0, 0);
  }
  
  // Get the original amount from fixkosten
  const { data: fixkostenData } = await supabase
    .from('fixkosten')
    .select('betrag')
    .eq('id', fixkostenId)
    .single();
  
  const originalAmount = fixkostenData?.betrag || 0;
  
  const newOverride = {
    id: uuidv4(),
    fixkosten_id: fixkostenId,
    original_date: dateToIsoString(normalizedOriginalDate) as string,
    new_date: normalizedNewDate ? dateToIsoString(normalizedNewDate) : null,
    original_amount: originalAmount,
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
    // Override already exists, return it
    return {
      ...existingOverride,
      original_date: new Date(existingOverride.original_date),
      new_date: existingOverride.new_date ? new Date(existingOverride.new_date) : null,
    } as FixkostenOverride;
  }
  
  const { data, error } = await supabase
    .from('fixkosten_overrides')
    .insert(newOverride)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding fixkosten override:', error.message);
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
}

/**
 * Match a Buchung (transaction) to a Fixkosten transaction and create an override to skip it
 * Server-side version using Supabase server client
 * 
 * @param buchung - The imported transaction to match
 * @param userId - Current user ID
 * @param supabase - Supabase server client
 * @returns The created override, or null if no match was found
 */
export async function matchBuchungToFixkostenServer(
  buchung: {
    date: Date;
    amount: number;
    details: string;
    direction: 'Incoming' | 'Outgoing';
  },
  userId: string,
  supabase: SupabaseClient
): Promise<FixkostenOverride | null> {
  try {
    // Only match outgoing transactions (Fixkosten are always outgoing)
    if (buchung.direction !== 'Outgoing') {
      return null;
    }

    // Load all fixkosten
    const fixkosten = await loadFixkostenServer(supabase);
    
    // Load existing overrides to avoid duplicates
    const existingOverrides = await loadFixkostenOverridesServer(supabase);
    
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
      const override = await addFixkostenOverrideServer(
        fixkostenId,
        originalDate,
        null, // newDate
        null, // newAmount
        true, // isSkipped
        `Automatisch übersprungen: Deckungsgleich mit importierter Buchung "${buchung.details}"`,
        userId,
        supabase
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

