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
    
    // Enhanced text normalization and matching
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        // Normalize Umlaute
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        // Remove common prefixes/suffixes that banks add
        .replace(/^(zahlung|payment|überweisung|transfer|lastschrift|debit)\s*/i, '')
        .replace(/\s*(zahlung|payment|überweisung|transfer|lastschrift|debit)$/i, '')
        // Remove IBANs, account numbers, reference numbers
        .replace(/iban\s*:?\s*[a-z0-9\s]+/gi, '')
        .replace(/ch\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{1}/gi, '') // Swiss IBAN format
        .replace(/ref\s*:?\s*[a-z0-9\s\-]+/gi, '')
        .replace(/referenz\s*:?\s*[a-z0-9\s\-]+/gi, '')
        .replace(/refnr\s*:?\s*[a-z0-9\s\-]+/gi, '')
        // Remove dates
        .replace(/\d{1,2}\.\d{1,2}\.\d{2,4}/g, '')
        .replace(/\d{4}-\d{2}-\d{2}/g, '')
        // Remove common separators and normalize whitespace
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    // Extract key words (remove common stop words)
    const extractKeyWords = (text: string): string[] => {
      const stopWords = new Set([
        'ag', 'gmbh', 'ltd', 'inc', 'corp', 'co', 'und', 'der', 'die', 'das',
        'von', 'zu', 'für', 'mit', 'bei', 'auf', 'in', 'an', 'am', 'zum',
        'the', 'and', 'or', 'of', 'for', 'with', 'at', 'in', 'on', 'to',
        'sa', 'sarl', 'bv', 'nv', 'oy', 'ab', 'as', 'oyj'
      ]);
      
      return text
        .split(/\s+/)
        .filter(word => word.length >= 2 && !stopWords.has(word))
        .map(word => word.replace(/[^\w]/g, ''))
        .filter(word => word.length > 0);
    };
    
    // Calculate text similarity score
    const calculateTextSimilarity = (text1: string, text2: string): number => {
      const normalized1 = normalizeText(text1);
      const normalized2 = normalizeText(text2);
      
      // Exact match after normalization
      if (normalized1 === normalized2) {
        return 1.0;
      }
      
      // Check if one contains the other (common case: bank adds extra info)
      // This is important: if fixkosten name is contained in bank transaction, it's likely a match
      if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return 0.9;
      }
      
      // Extract key words
      const words1 = extractKeyWords(text1);
      const words2 = extractKeyWords(text2);
      
      if (words1.length === 0 || words2.length === 0) {
        return 0;
      }
      
      // Special handling: if one text is much shorter, check if all its words appear in the longer one
      // This handles cases like "Zuerich Betriebshaftpflicht" vs "Zuerich Versicherungs-Gesellschaft AG..."
      const shorterWords = words1.length <= words2.length ? words1 : words2;
      const longerWords = words1.length > words2.length ? words1 : words2;
      const longerText = words1.length > words2.length ? normalized1 : normalized2;
      const shorterText = words1.length <= words2.length ? normalized1 : normalized2;
      
      // If shorter text has 2-4 words, check if most/all appear in longer text
      if (shorterWords.length >= 2 && shorterWords.length <= 4) {
        let foundInLonger = 0;
        const foundWords: string[] = [];
        
        for (const shortWord of shorterWords) {
          // Check if word appears in longer text (as substring, not just as word)
          if (longerText.includes(shortWord)) {
            foundInLonger++;
            foundWords.push(shortWord);
          } else {
            // Also check if any longer word contains this word (substring match)
            const found = longerWords.some(longWord => {
              if (longWord.includes(shortWord) || shortWord.includes(longWord)) {
                return true;
              }
              // Also check if words share significant substrings (for compound words)
              if (shortWord.length >= 8 && longWord.length >= 8) {
                // Check if they share a significant prefix or suffix
                const minLen = Math.min(shortWord.length, longWord.length);
                for (let len = Math.min(6, minLen); len >= 4; len--) {
                  if (shortWord.substring(0, len) === longWord.substring(0, len) ||
                      shortWord.substring(shortWord.length - len) === longWord.substring(longWord.length - len)) {
                    return true;
                  }
                }
              }
              return false;
            });
            if (found) {
              foundInLonger++;
              foundWords.push(shortWord);
            }
          }
        }
        
        console.log(`[MATCH DEBUG] Short text: "${shorterText}", Found ${foundInLonger}/${shorterWords.length} words: [${foundWords.join(', ')}]`);
        
        // More lenient matching: if at least 1 word matches and it's a short name (2 words), accept it
        // This handles cases like "Zuerich Betriebshaftpflicht" where "Zuerich" matches
        if (shorterWords.length === 2 && foundInLonger >= 1) {
          // Check if the matching word is significant (not just a common word)
          const significantWords = ['zuerich', 'zurich', 'basel', 'bern', 'genf', 'lausanne', 'versicherung', 'insurance'];
          const matchedWord = foundWords[0];
          if (significantWords.some(sig => matchedWord.includes(sig) || sig.includes(matchedWord))) {
            console.log(`[MATCH DEBUG] Accepting match based on significant word: "${matchedWord}"`);
            return 0.65; // Accept match with significant word
          }
        }
        
        // If at least 50% of shorter words found, and at least 2 words match, consider it a match
        const matchRatio = foundInLonger / shorterWords.length;
        if (matchRatio >= 0.5 && foundInLonger >= 2) {
          return 0.7; // Good match
        }
        if (matchRatio >= 0.5 && foundInLonger >= 1 && shorterWords.length <= 2) {
          return 0.6; // Acceptable match for very short names
        }
      }
      
      // Count matching words (with fuzzy matching)
      let matches = 0;
      const matchedWords2 = new Set<string>();
      
      for (const word1 of words1) {
        for (const word2 of words2) {
          if (matchedWords2.has(word2)) continue;
          
          // Exact match
          if (word1 === word2) {
            matches++;
            matchedWords2.add(word2);
            break;
          }
          
          // Substring match (one word contains the other) - improved for longer words
          if (word1.length >= 3 && word2.length >= 3) {
            if (word1.includes(word2) || word2.includes(word1)) {
              matches++;
              matchedWords2.add(word2);
              break;
            }
          }
          
          // Levenshtein-like: check if words are similar (max 1 char difference for short words, 2 for longer)
          const maxDiff = word1.length <= 4 ? 1 : 2;
          if (Math.abs(word1.length - word2.length) <= maxDiff) {
            let diff = 0;
            const minLen = Math.min(word1.length, word2.length);
            for (let i = 0; i < minLen; i++) {
              if (word1[i] !== word2[i]) diff++;
            }
            diff += Math.abs(word1.length - word2.length);
            if (diff <= maxDiff) {
              matches++;
              matchedWords2.add(word2);
              break;
            }
          }
        }
      }
      
      // Improved similarity calculation: use minimum word count instead of average
      // This helps when one text is much longer (bank transaction) than the other (fixkosten name)
      const minWords = Math.min(words1.length, words2.length);
      const similarity = matches / Math.max(minWords, 1);
      
      // Also check: if we have at least 2 matches, boost the score
      if (matches >= 2) {
        return Math.max(similarity, 0.5);
      }
      
      return similarity;
    };
    
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
    
    console.log(`[MATCH DEBUG] Checking ${fixkostenTransactions.length} fixkosten transactions for buchung: "${buchung.details}" (${buchung.amount}, ${buchung.date.toISOString().split('T')[0]})`);
    
    // Find matching fixkosten transaction
    for (const fixkostenTx of fixkostenTransactions) {
      // Check amount match (within 1% tolerance)
      const amountDiff = Math.abs(fixkostenTx.amount - buchung.amount);
      const amountTolerance = buchung.amount * 0.01;
      
      if (amountDiff > amountTolerance) {
        console.log(`[MATCH DEBUG] Amount mismatch: ${fixkostenTx.amount} vs ${buchung.amount} (diff: ${amountDiff.toFixed(2)}, tolerance: ${amountTolerance.toFixed(2)})`);
        continue;
      }
      
      // Check date match (within ±7 days)
      const dateDiff = Math.abs(fixkostenTx.date.getTime() - buchung.date.getTime());
      const maxDateDiff = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      const daysDiff = Math.round(dateDiff / (24 * 60 * 60 * 1000));
      
      if (dateDiff > maxDateDiff) {
        console.log(`[MATCH DEBUG] Date mismatch: ${fixkostenTx.date.toISOString().split('T')[0]} vs ${buchung.date.toISOString().split('T')[0]} (diff: ${daysDiff} days)`);
        continue;
      }
      
      // Check text similarity (enhanced fuzzy match)
      const textSimilarity = calculateTextSimilarity(buchung.details, fixkostenTx.details);
      
      // Require minimum similarity score
      // Lower threshold when amount and date match perfectly (high confidence)
      const amountMatchPerfect = amountDiff < 0.01; // Exact match (within 1 cent)
      const dateMatchClose = dateDiff <= 5 * 24 * 60 * 60 * 1000; // Within 5 days (increased from 3)
      
      // If amount matches perfectly and date is close, be very lenient with text
      // This handles cases where bank adds lots of extra text
      let minSimilarity = 0.3;
      if (amountMatchPerfect && dateMatchClose) {
        minSimilarity = 0.2; // Very lenient - only need 20% text match
      } else if (amountMatchPerfect) {
        minSimilarity = 0.25; // Lenient if amount matches
      } else if (dateMatchClose) {
        minSimilarity = 0.28; // Slightly lenient if date is close
      }
      
      console.log(`[MATCH DEBUG] Comparing "${buchung.details}" vs "${fixkostenTx.details}"`);
      console.log(`[MATCH DEBUG] Similarity: ${(textSimilarity * 100).toFixed(1)}%, min required: ${(minSimilarity * 100).toFixed(1)}%, amount diff: ${amountDiff.toFixed(2)}, date diff: ${daysDiff} days`);
      
      if (textSimilarity < minSimilarity) {
        console.log(`[MATCH DEBUG] Text similarity too low, skipping`);
        continue;
      }
      
      console.log(`[MATCH DEBUG] ✓ Match found! Similarity: ${(textSimilarity * 100).toFixed(1)}%`);
      
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

