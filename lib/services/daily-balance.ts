/**
 * Service for managing global daily balance snapshots
 * This provides historical integrity for balance calculations
 * Now uses a single global balance shared across all users
 */

import { supabase } from '@/lib/supabase/client';
import { DailyBalanceSnapshot, CurrentBalance } from '@/models/types';
import logger from '@/lib/logger';

// Global balance identifier - using a fixed ID for the single global balance
const GLOBAL_BALANCE_ID = 'global';

/**
 * Get the balance for a specific date (global)
 * If no snapshot exists for that date, returns the most recent balance before that date
 */
export async function getBalanceForDate(date: Date): Promise<number> {
  try {
    const dateString = date.toISOString().split('T')[0];
    
    // First try to get the exact date snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('daily_balance_snapshots')
      .select('balance')
      .eq('user_id', GLOBAL_BALANCE_ID)
      .eq('date', dateString)
      .single();
    
    if (snapshot && !snapshotError) {
      return snapshot.balance;
    }
    
    // If no snapshot for that date, get the most recent balance before that date
    const { data: previousSnapshot, error: previousError } = await supabase
      .from('daily_balance_snapshots')
      .select('balance')
      .eq('user_id', GLOBAL_BALANCE_ID)
      .lt('date', dateString)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    if (previousSnapshot && !previousError) {
      return previousSnapshot.balance;
    }
    
    // If no previous snapshots, get the current balance
    const currentBalance = await getCurrentBalance();
    return currentBalance.balance;
    
  } catch (err) {
    logger.logError(err, 'Error getting balance for date', { date });
    return 0;
  }
}

/**
 * Get the current global balance
 */
export async function getCurrentBalance(): Promise<CurrentBalance> {
  try {
    const { data, error } = await supabase
      .from('current_balance')
      .select('*')
      .eq('user_id', GLOBAL_BALANCE_ID)
      .single();
    
    if (error) {
      // If no global balance exists yet, create one with default value
      if (error.code === 'PGRST116') {
        const defaultBalance = await setCurrentBalance(0);
        return defaultBalance;
      }
      
      logger.logError(error, 'Error loading current balance');
      return {
        user_id: GLOBAL_BALANCE_ID,
        balance: 0,
        effective_date: new Date(),
        updated_at: new Date().toISOString()
      };
    }
    
    return {
      ...data,
      effective_date: new Date(data.effective_date),
      updated_at: data.updated_at
    };
  } catch (err) {
    logger.logError(err, 'Exception in getCurrentBalance');
    return {
      user_id: GLOBAL_BALANCE_ID,
      balance: 0,
      effective_date: new Date(),
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Set the current global balance (creates a snapshot for today)
 */
export async function setCurrentBalance(balance: number): Promise<CurrentBalance> {
  try {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Create or update the daily snapshot for today
    const { data: snapshot, error: snapshotError } = await supabase
      .from('daily_balance_snapshots')
      .upsert({
        date: todayString,
        balance,
        user_id: GLOBAL_BALANCE_ID
      }, {
        onConflict: 'date,user_id'
      })
      .select('*')
      .single();
    
    if (snapshotError) {
      logger.logError(snapshotError, 'Error creating daily snapshot', { balance });
    }
    
    // Update the current balance reference
    const { data, error } = await supabase
      .from('current_balance')
      .upsert({
        user_id: GLOBAL_BALANCE_ID,
        balance,
        effective_date: todayString
      }, {
        onConflict: 'user_id'
      })
      .select('*')
      .single();
    
    if (error) {
      logger.logError(error, 'Error updating current balance', { balance });
      return {
        user_id: GLOBAL_BALANCE_ID,
        balance,
        effective_date: today,
        updated_at: new Date().toISOString()
      };
    }
    
    logger.info('Global balance updated', { balance, date: todayString });
    
    return {
      ...data,
      effective_date: new Date(data.effective_date),
      updated_at: data.updated_at
    };
  } catch (err) {
    logger.logError(err, 'Exception in setCurrentBalance', { balance });
    return {
      user_id: GLOBAL_BALANCE_ID,
      balance,
      effective_date: new Date(),
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Set balance for a specific date (creates a snapshot)
 */
export async function setBalanceForDate(date: Date, balance: number): Promise<DailyBalanceSnapshot> {
  try {
    const dateString = date.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_balance_snapshots')
      .upsert({
        date: dateString,
        balance,
        user_id: GLOBAL_BALANCE_ID
      }, {
        onConflict: 'date,user_id'
      })
      .select('*')
      .single();
    
    if (error) {
      logger.logError(error, 'Error setting balance for date', { date: dateString, balance });
      throw error;
    }
    
    logger.info('Balance set for date', { date: dateString, balance });
    
    return {
      ...data,
      date: new Date(data.date),
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (err) {
    logger.logError(err, 'Exception in setBalanceForDate', { date, balance });
    throw err;
  }
}

/**
 * Get balance history for a date range
 */
export async function getBalanceHistory(startDate: Date, endDate: Date): Promise<DailyBalanceSnapshot[]> {
  try {
    const startString = startDate.toISOString().split('T')[0];
    const endString = endDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_balance_snapshots')
      .select('*')
      .eq('user_id', GLOBAL_BALANCE_ID)
      .gte('date', startString)
      .lte('date', endString)
      .order('date', { ascending: true });
    
    if (error) {
      logger.logError(error, 'Error getting balance history', { startDate, endDate });
      return [];
    }
    
    return (data || []).map(item => ({
      ...item,
      date: new Date(item.date),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
  } catch (err) {
    logger.logError(err, 'Exception in getBalanceHistory', { startDate, endDate });
    return [];
  }
}

/**
 * Migrate existing user balance to global balance (for migration purposes)
 */
export async function migrateToGlobalBalance(existingBalance: number): Promise<void> {
  try {
    await setCurrentBalance(existingBalance);
    logger.info('Migrated to global balance system', { balance: existingBalance });
  } catch (err) {
    logger.logError(err, 'Error migrating to global balance', { existingBalance });
    throw err;
  }
} 