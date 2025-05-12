/**
 * Service for handling transactions (Buchungen) in the application
 * Equivalent to logic/storage_buchungen.py in the Python app
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { Buchung, EnhancedTransaction, TransactionCategory } from '@/models/types';
import { dateToIsoString } from '@/lib/date-utils/format';
import { getSignedAmount } from '@/lib/currency/format';

/**
 * Load all transactions/buchungen from the database
 * @param userId Optional user ID to filter transactions
 */
export async function loadBuchungen(userId?: string): Promise<Buchung[]> {
  let query = supabase.from('buchungen').select('*');
  
  // Filter by user if specified
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.order('date', { ascending: true });
  
  if (error) {
    console.error('Error loading transactions:', error.message);
    throw new Error(`Failed to load transactions: ${error.message}`);
  }
  
  return (data || []).map(item => ({
    ...item,
    date: new Date(item.date),
  })) as Buchung[];
}

/**
 * Add a new transaction to the database
 */
export async function addBuchung(
  date: Date, 
  details: string, 
  amount: number, 
  direction: 'Incoming' | 'Outgoing',
  userId: string,
  kategorie?: string
): Promise<Buchung> {
  const now = new Date().toISOString();
  const newBuchung = {
    id: uuidv4(),
    date: dateToIsoString(date) as string,
    details,
    amount,
    direction,
    modified: false,
    kategorie: kategorie || 'Standard',
    user_id: userId,
    created_at: now,
    updated_at: now
  };
  
  const { data, error } = await supabase
    .from('buchungen')
    .insert(newBuchung)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding transaction:', error.message);
    throw new Error(`Failed to add transaction: ${error.message}`);
  }
  
  return {
    ...data,
    date: new Date(data.date),
  } as Buchung;
}

/**
 * Update an existing transaction by ID
 */
export async function updateBuchungById(
  id: string,
  updates: Partial<Buchung>,
  userId: string
): Promise<Buchung> {
  // Ensure the date is formatted correctly if provided
  const formattedUpdates = {
    ...updates,
    date: updates.date ? dateToIsoString(updates.date) : undefined,
    modified: true,
    updated_at: new Date().toISOString(),
    user_id: userId
  };
  
  const { data, error } = await supabase
    .from('buchungen')
    .update(formattedUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating transaction:', error.message);
    throw new Error(`Failed to update transaction: ${error.message}`);
  }
  
  return {
    ...data,
    date: new Date(data.date),
  } as Buchung;
}

/**
 * Delete a transaction by ID
 */
export async function deleteBuchungById(id: string): Promise<void> {
  const { error } = await supabase
    .from('buchungen')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting transaction:', error.message);
    throw new Error(`Failed to delete transaction: ${error.message}`);
  }
}

/**
 * Process transactions to calculate running balance and add markers
 * Similar to the functionality in planung.py in the Python app
 */
export function enhanceTransactions(
  transactions: Buchung[], 
  startBalance: number = 0
): EnhancedTransaction[] {
  let runningBalance = startBalance;
  
  // Sort by date
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  
  // Add calculated fields
  return sortedTransactions.map(transaction => {
    // Get the proper signed amount (negative for outgoing)
    const signedAmount = getSignedAmount(transaction.amount, transaction.direction);
    
    // Update running balance
    runningBalance += signedAmount;
    
    // Determine category
    const kategorie = transaction.kategorie as TransactionCategory || 'Standard';
    
    // Generate hints icons
    let hinweis = '';
    if (transaction.modified) hinweis += '✏️ ';
    if (kategorie === 'Fixkosten') hinweis += '📌 ';
    if (kategorie === 'Simulation') hinweis += '🔮 ';
    if (kategorie === 'Lohn') hinweis += '💰 ';
    
    // Return enhanced transaction
    return {
      ...transaction,
      kontostand: runningBalance,
      hinweis: hinweis.trim(),
      kategorie
    };
  });
}

/**
 * Filter transactions by date range and optional criteria
 */
export function filterTransactions(
  transactions: EnhancedTransaction[],
  startDate: Date,
  endDate: Date,
  options?: {
    searchText?: string;
    minAmount?: number;
    maxAmount?: number;
    kategorie?: TransactionCategory[];
    showModified?: boolean;
  }
): EnhancedTransaction[] {
  return transactions.filter(tx => {
    // Date range filter
    if (tx.date < startDate || tx.date > endDate) return false;
    
    // Text search filter
    if (options?.searchText && !tx.details.toLowerCase().includes(options.searchText.toLowerCase())) {
      return false;
    }
    
    // Amount range filter
    const absAmount = Math.abs(getSignedAmount(tx.amount, tx.direction));
    if (options?.minAmount !== undefined && absAmount < options.minAmount) return false;
    if (options?.maxAmount !== undefined && absAmount > options.maxAmount) return false;
    
    // Category filter
    if (options?.kategorie && options.kategorie.length > 0 && !options.kategorie.includes(tx.kategorie)) {
      return false;
    }
    
    // Modified filter
    if (options?.showModified && !tx.modified) return false;
    
    return true;
  });
} 