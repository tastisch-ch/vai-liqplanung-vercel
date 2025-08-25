/**
 * Service for handling transactions (Buchungen) in the application
 * Equivalent to logic/storage_buchungen.py in the Python app
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { Buchung, EnhancedTransaction, TransactionCategory } from '@/models/types';
import { dateToIsoString, adjustPaymentDate } from '@/lib/date-utils/format';
import { getSignedAmount } from '@/lib/currency/format';
import { convertFixkostenToBuchungen, loadFixkosten } from './fixkosten';
import { convertSimulationenToBuchungen, loadSimulationen } from './simulationen';
import { convertLohnkostenToBuchungen } from './lohnkosten';
import { loadMitarbeiter } from './mitarbeiter';
import { getCurrentBalance } from './daily-balance';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/models/database.types';

/**
 * Load all transactions/buchungen from the database
 * All users can see all transactions
 */
export async function loadBuchungen(userId?: string): Promise<Buchung[]> {
  try {
    let query = supabase.from('buchungen').select('*');
    
    // No longer filtering by user_id
    // All users see all transactions
    
    const { data, error } = await query.order('date', { ascending: true });
    
    if (error) {
      console.error('Error loading transactions:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'buchungen' not found. Please check your database setup.`);
      }
      throw new Error(`Failed to load transactions: ${error.message}`);
    }
    
    // Convert dates and shift past due dates for Incoming transactions
    return (data || []).map(item => {
      const transaction = {
        ...item,
        date: new Date(item.date),
      } as Buchung;
      
      // Apply the dynamic date shifting for past due dates
      if (transaction.direction === 'Incoming') {
        return shiftPastDueDateIfNeeded(transaction);
      }
      
      return transaction;
    });
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to load transactions')) {
      throw error;
    }
    console.error('Unexpected error loading transactions:', error);
    throw new Error(`Failed to load transactions: ${error.message || 'Unknown error'}`);
  }
}

/**
 * If an Incoming transaction has a date in the past, shift it to tomorrow
 * This is applied dynamically when loading transactions, not when storing them
 */
export function shiftPastDueDateIfNeeded(transaction: Buchung): Buchung {
  // Only apply to Incoming transactions (payments we expect to receive)
  if (transaction.direction !== 'Incoming') {
    return transaction;
  }
  
  // Check if the date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
  
  if (transaction.date < today) {
    // For past due dates, shift to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Return a new object with the shifted date (don't modify the original)
    return {
      ...transaction,
      date: tomorrow,
      // Add a flag to indicate this date was shifted (for UI purposes if needed)
      shifted: true
    };
  }
  
  // Date is not in the past, use as is
  return transaction;
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
  try {
    const now = new Date().toISOString();
    const newBuchung = {
      id: uuidv4(),
      date: dateToIsoString(date) as string,
      details,
      amount,
      direction,
      modified: false,
      kategorie: kategorie || 'Standard',
      // Still store the creator's user_id for reference, but won't filter by it
      user_id: userId,
      created_at: now,
      updated_at: now,
      is_simulation: false
    };
    
    const { data, error } = await supabase
      .from('buchungen')
      .insert(newBuchung)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding transaction:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'buchungen' not found. Please check your database setup.`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      }
      throw new Error(`Failed to add transaction: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned after adding transaction');
    }
    
    return {
      ...data,
      date: new Date(data.date),
    } as Buchung;
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to add transaction')) {
      throw error;
    }
    console.error('Unexpected error adding transaction:', error);
    throw new Error(`Failed to add transaction: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing transaction by ID
 */
export async function updateBuchungById(
  id: string,
  updates: Partial<Buchung>,
  userId: string
): Promise<Buchung> {
  try {
    // Ensure the date is formatted correctly if provided
    const formattedUpdates = {
      ...updates,
      date: updates.date ? dateToIsoString(updates.date) : undefined,
      modified: true,
      updated_at: new Date().toISOString(),
      // Keep the original user_id, don't override it
      // user_id: userId
    };
    
    // Remove user_id from updates to preserve the original creator
    if ('user_id' in formattedUpdates) {
      delete formattedUpdates.user_id;
    }
    
    const { data, error } = await supabase
      .from('buchungen')
      .update(formattedUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating transaction:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'buchungen' not found`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      }
      throw new Error(`Failed to update transaction: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Transaction with ID ${id} not found`);
    }
    
    return {
      ...data,
      date: new Date(data.date),
    } as Buchung;
  } catch (error: any) {
    if (error.message && (error.message.includes('Failed to update transaction') || error.message.includes('not found'))) {
      throw error;
    }
    console.error('Unexpected error updating transaction:', error);
    throw new Error(`Failed to update transaction: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a transaction by ID
 */
export async function deleteBuchungById(id: string): Promise<void> {
  try {
  const { error } = await supabase
    .from('buchungen')
    .delete()
    .eq('id', id);
  
  if (error) {
      console.error('Error deleting transaction:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'buchungen' not found`);
      } else if (error.code === '23503') {
        throw new Error(`This transaction cannot be deleted because it is referenced by other records`);
      }
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to delete transaction')) {
      throw error;
    }
    console.error('Unexpected error deleting transaction:', error);
    throw new Error(`Failed to delete transaction: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Enhance transactions with additional data like running balance
 * Now uses global daily balance system for accurate current balance
 */
export async function enhanceTransactions(
  transactions: Buchung[], 
  userId?: string, // Optional for backward compatibility, but not used
  currentBalance?: number
): Promise<EnhancedTransaction[]> {
  // Get today's global balance if not provided
  if (!currentBalance) {
    try {
      const balanceData = await getCurrentBalance();
      currentBalance = balanceData.balance;
    } catch (error) {
      console.warn('Could not get current balance, using 0:', error);
      currentBalance = 0;
    }
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  // Sort by date (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Apply weekend and month-end date adjustments to all transactions
  const adjustedTransactions = sortedTransactions.map(tx => {
    // First apply date shifting for past due incoming transactions
    let transaction = tx;
    if (tx.direction === 'Incoming') {
      transaction = shiftPastDueDateIfNeeded(tx);
    }
    
    // Then apply weekend/month-end adjustments to all transactions
    // Only apply if not already adjusted (check if it has a shifted flag)
    if (!transaction.shifted) {
      // Check if this is an end-of-month date (day 30+ or last day of month)
      const originalDate = new Date(transaction.date);
      const originalDay = originalDate.getDate();
      const lastDayOfMonth = new Date(
        originalDate.getFullYear(), 
        originalDate.getMonth() + 1, 
        0
      ).getDate();
      
      // Detect if this is an end-of-month date
      const isMonthEnd = originalDay === lastDayOfMonth || originalDay >= 30;
      
      // Use adjustPaymentDate with proper isMonthEnd parameter
      const adjustedDate = adjustPaymentDate(new Date(transaction.date), isMonthEnd);
      
      // Only create a new object if the date actually changed
      if (adjustedDate.getTime() !== transaction.date.getTime()) {
        return {
          ...transaction,
          date: adjustedDate,
          // Don't set 'shifted' flag here as that's only for past-due shifting
        };
      }
    }
    
    return transaction;
  });
  
  // Separate transactions into historical (past and today) and future
  // Today's transactions are included in past since they're already reflected in current balance
  const pastTransactions = adjustedTransactions.filter(tx => tx.date <= today);
  const futureTransactions = adjustedTransactions.filter(tx => tx.date > today);
  
  // For historical transactions, we don't calculate running balance
  // They keep their historical context
  const enhancedPastTransactions = pastTransactions.map(tx => {
    // Keep the original kategorie if it exists, ensuring it's a valid TransactionCategory
    const kategorie = (tx.kategorie || 'Standard') as TransactionCategory;
    
    // Generate hints icons
    let hinweis = '';
    if (tx.modified) hinweis += '✏️ ';
    if (kategorie === 'Fixkosten') hinweis += '📌 ';
    if (kategorie === 'Simulation') hinweis += '🔮 ';
    if (kategorie === 'Lohn') hinweis += '💰 ';
    
    return {
      ...tx,
      kontostand: undefined, // No balance calculation for historical transaction
      signedAmount: getSignedAmount(tx.amount, tx.direction),
      kategorie,
      hinweis: hinweis.trim()
    };
  });
  
  // For future transactions (excluding today), calculate running balance starting from current balance
  let runningBalance = currentBalance || 0;
  console.log(`[DEBUG] Starting balance: CHF ${runningBalance}`);
  console.log(`[DEBUG] Future transactions count: ${futureTransactions.length}`);
  console.log(`[DEBUG] First 3 future transactions:`, futureTransactions.slice(0, 3).map(tx => ({
    date: tx.date.toISOString().split('T')[0],
    details: tx.details?.substring(0, 30),
    amount: tx.amount,
    direction: tx.direction,
    shifted: tx.shifted
  })));
  const enhancedFutureTransactions = futureTransactions.map(tx => {
    // Update running balance based on transaction direction
    if (tx.direction === 'Incoming') {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.amount;
    }
    
    // Keep the original kategorie if it exists, ensuring it's a valid TransactionCategory
    const kategorie = (tx.kategorie || 'Standard') as TransactionCategory;
    
    // Generate hints icons
    let hinweis = '';
    if (tx.modified) hinweis += '✏️ ';
    if (kategorie === 'Fixkosten') hinweis += '📌 ';
    if (kategorie === 'Simulation') hinweis += '🔮 ';
    if (kategorie === 'Lohn') hinweis += '💰 ';
    
    return {
      ...tx,
      kontostand: runningBalance,
      signedAmount: getSignedAmount(tx.amount, tx.direction),
      kategorie,
      hinweis: hinweis.trim()
    };
  });
  
  // Combine historical and future transactions
  return [...enhancedPastTransactions, ...enhancedFutureTransactions];
}

/**
 * Legacy version of enhanceTransactions for backward compatibility
 * @deprecated Use the new async version with userId parameter
 */
export function enhanceTransactionsSync(transactions: Buchung[], startBalance: number = 0): EnhancedTransaction[] {
  console.warn('enhanceTransactionsSync is deprecated, use enhanceTransactions with userId');
  
  // Sort by date (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Apply weekend and month-end date adjustments to all transactions
  const adjustedTransactions = sortedTransactions.map(tx => {
    // First apply date shifting for past due incoming transactions
    let transaction = tx;
    if (tx.direction === 'Incoming') {
      transaction = shiftPastDueDateIfNeeded(tx);
    }
    
    // Then apply weekend/month-end adjustments to all transactions
    // Only apply if not already adjusted (check if it has a shifted flag)
    if (!transaction.shifted) {
      // Check if this is an end-of-month date (day 30+ or last day of month)
      const originalDate = new Date(transaction.date);
      const originalDay = originalDate.getDate();
      const lastDayOfMonth = new Date(
        originalDate.getFullYear(), 
        originalDate.getMonth() + 1, 
        0
      ).getDate();
      
      // Detect if this is an end-of-month date
      const isMonthEnd = originalDay === lastDayOfMonth || originalDay >= 30;
      
      // Use adjustPaymentDate with proper isMonthEnd parameter
      const adjustedDate = adjustPaymentDate(new Date(transaction.date), isMonthEnd);
      
      // Only create a new object if the date actually changed
      if (adjustedDate.getTime() !== transaction.date.getTime()) {
        return {
          ...transaction,
          date: adjustedDate,
          // Don't set 'shifted' flag here as that's only for past-due shifting
        };
      }
    }
    
    return transaction;
  });
  
  // Calculate running balance and create enhanced transactions
  let runningBalance = startBalance;
  
  return adjustedTransactions.map(tx => {
    // Update running balance based on transaction direction
    if (tx.direction === 'Incoming') {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.amount;
    }
    
    // Determine category for the enhanced transaction
    const kategorie = tx.kategorie as TransactionCategory || 'Standard';
    
    // Generate hints icons
    let hinweis = '';
    if (tx.modified) hinweis += '✏️ ';
    if (kategorie === 'Fixkosten') hinweis += '📌 ';
    if (kategorie === 'Simulation') hinweis += '🔮 ';
    if (kategorie === 'Lohn') hinweis += '💰 ';
    
    // Create enhanced transaction with running balance
    return {
      ...tx,
      kontostand: runningBalance,
      signedAmount: getSignedAmount(tx.amount, tx.direction),
      kategorie,
      hinweis: hinweis.trim()
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

/**
 * Get all transactions for planning, including fixed costs, simulations, and salary costs
 */
export async function getAllTransactionsForPlanning(
  userId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    includeFixkosten?: boolean;
    includeSimulationen?: boolean;
    includeLohnkosten?: boolean;
  }
): Promise<Buchung[]> {
  try {
    // Default options
    const { 
      includeFixkosten = true, 
      includeSimulationen = true,
      includeLohnkosten = true 
    } = options || {};
    
    // Load all data types in parallel
    const [buchungen, fixkosten, simulationen, mitarbeiter] = await Promise.all([
      loadBuchungen(userId),
      includeFixkosten ? loadFixkosten(userId) : Promise.resolve([]),
      includeSimulationen ? loadSimulationen(userId) : Promise.resolve([]),
      includeLohnkosten ? loadMitarbeiter(userId) : Promise.resolve([])
    ]);
    
    // Filter Buchungen within date range
    const filteredBuchungen = buchungen.filter(
      tx => tx.date >= startDate && tx.date <= endDate
    );
    
    // Generate transactions from other sources
    const fixkostenBuchungen = includeFixkosten 
      ? convertFixkostenToBuchungen(startDate, endDate, fixkosten)
      : [];
      
    const simulationenBuchungen = includeSimulationen
      ? convertSimulationenToBuchungen(startDate, endDate, simulationen)
      : [];
      
    const lohnkostenBuchungen = includeLohnkosten
      ? convertLohnkostenToBuchungen(startDate, endDate, mitarbeiter)
      : [];
    
    // Combine all transactions and return
    return [
      ...filteredBuchungen,
      ...fixkostenBuchungen,
      ...simulationenBuchungen,
      ...lohnkostenBuchungen
    ];
  } catch (error: any) {
    console.error('Error getting all transactions:', error);
    throw new Error(`Failed to get all transactions: ${error.message || 'Unknown error'}`);
  }
}

export async function fetchTransactions(filters: {
  showFixkosten: boolean;
  showLohn: boolean;
  showStandard: boolean;
  showSimulations: boolean;
}) {
  const supabase = createClientComponentClient<Database>();

  let query = supabase
    .from('buchungen')
    .select('*')
    .order('date', { ascending: false });

  // Build category filter conditions
  const conditions = [];
  
  if (filters.showFixkosten) {
    conditions.push("kategorie.eq.Fixkosten");
  }
  
  if (filters.showLohn) {
    conditions.push("kategorie.eq.Lohn");
  }
  
  if (filters.showStandard) {
    conditions.push("kategorie.eq.Standard");
    conditions.push("kategorie.is.null");
  }

  if (filters.showSimulations) {
    conditions.push("kategorie.eq.Simulation");
  }

  // If any conditions exist, apply them
  if (conditions.length > 0) {
    query = query.or(conditions.join(','));
  } else {
    // If no categories are selected, return nothing
    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  console.log('Executing query with filters:', {
    showFixkosten: filters.showFixkosten,
    showLohn: filters.showLohn,
    showStandard: filters.showStandard,
    showSimulations: filters.showSimulations,
    conditions
  });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }

  if (!data) {
    console.warn('No data returned from query');
    return [];
  }

  console.log(`Found ${data.length} transactions with categories:`, 
    data.reduce((acc, tx) => {
      const cat = tx.kategorie || 'null';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  // Convert date strings to Date objects
  return data.map(transaction => ({
    ...transaction,
    date: new Date(transaction.date)
  }));
} 