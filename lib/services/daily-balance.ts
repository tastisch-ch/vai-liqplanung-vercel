/**
 * Service for managing daily balance snapshots
 * This provides historical integrity for balance calculations
 */

import { supabase } from '@/lib/supabase/client';
import { DailyBalanceSnapshot, CurrentBalance } from '@/models/types';
import logger from '@/lib/logger';

/**
 * Get the balance for a specific date
 * If no snapshot exists for that date, returns the most recent balance before that date
 */
export async function getBalanceForDate(userId: string, date: Date): Promise<number> {
  try {
    const dateString = date.toISOString().split('T')[0];
    
    // First try to get the exact date snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('daily_balance_snapshots')
      .select('balance')
      .eq('user_id', userId)
      .eq('date', dateString)
      .single();
    
    if (snapshot && !snapshotError) {
      return snapshot.balance;
    }
    
    // If no snapshot for that date, get the most recent balance before that date
    const { data: previousSnapshot, error: previousError } = await supabase
      .from('daily_balance_snapshots')
      .select('balance')
      .eq('user_id', userId)
      .lt('date', dateString)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    if (previousSnapshot && !previousError) {
      return previousSnapshot.balance;
    }
    
    // If no previous snapshots, get the current balance
    const currentBalance = await getCurrentBalance(userId);
    return currentBalance.balance;
    
  } catch (err) {
    logger.logError(err, 'Error getting balance for date', { userId, date });
    return 0;
  }
}

/**
 * Get the current balance (today's balance)
 */
export async function getCurrentBalance(userId: string): Promise<CurrentBalance> {
  try {
    const { data, error } = await supabase
      .from('current_balance')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      logger.logError(error, 'Error loading current balance', { userId });
      return {
        user_id: userId,
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
    logger.logError(err, 'Exception in getCurrentBalance', { userId });
    return {
      user_id: userId,
      balance: 0,
      effective_date: new Date(),
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Set the current balance (creates a snapshot for today)
 */
export async function setCurrentBalance(userId: string, balance: number): Promise<CurrentBalance> {
  try {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Create or update the daily snapshot for today
    const { data: snapshot, error: snapshotError } = await supabase
      .from('daily_balance_snapshots')
      .upsert({
        date: todayString,
        balance,
        user_id: userId
      }, {
        onConflict: 'date,user_id'
      })
      .select('*')
      .single();
    
    if (snapshotError) {
      logger.logError(snapshotError, 'Error creating daily snapshot', { userId, balance });
    }
    
    // Update the current balance reference
    const { data, error } = await supabase
      .from('current_balance')
      .upsert({
        user_id: userId,
        balance,
        effective_date: todayString
      }, {
        onConflict: 'user_id'
      })
      .select('*')
      .single();
    
    if (error) {
      logger.logError(error, 'Error updating current balance', { userId, balance });
      return {
        user_id: userId,
        balance,
        effective_date: today,
        updated_at: new Date().toISOString()
      };
    }
    
    logger.info('Current balance updated', { userId, balance, date: todayString });
    
    return {
      ...data,
      effective_date: new Date(data.effective_date),
      updated_at: data.updated_at
    };
  } catch (err) {
    logger.logError(err, 'Exception in setCurrentBalance', { userId, balance });
    return {
      user_id: userId,
      balance,
      effective_date: new Date(),
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Set balance for a specific date (creates a snapshot)
 */
export async function setBalanceForDate(userId: string, date: Date, balance: number): Promise<DailyBalanceSnapshot> {
  try {
    const dateString = date.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_balance_snapshots')
      .upsert({
        date: dateString,
        balance,
        user_id: userId
      }, {
        onConflict: 'date,user_id'
      })
      .select('*')
      .single();
    
    if (error) {
      logger.logError(error, 'Error setting balance for date', { userId, date: dateString, balance });
      throw error;
    }
    
    logger.info('Balance set for date', { userId, date: dateString, balance });
    
    return {
      ...data,
      date: new Date(data.date),
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (err) {
    logger.logError(err, 'Exception in setBalanceForDate', { userId, date, balance });
    throw err;
  }
}

/**
 * Get balance history for a date range
 */
export async function getBalanceHistory(userId: string, startDate: Date, endDate: Date): Promise<DailyBalanceSnapshot[]> {
  try {
    const startString = startDate.toISOString().split('T')[0];
    const endString = endDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_balance_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startString)
      .lte('date', endString)
      .order('date', { ascending: true });
    
    if (error) {
      logger.logError(error, 'Error getting balance history', { userId, startDate, endDate });
      return [];
    }
    
    return data.map(snapshot => ({
      ...snapshot,
      date: new Date(snapshot.date),
      created_at: snapshot.created_at,
      updated_at: snapshot.updated_at
    }));
  } catch (err) {
    logger.logError(err, 'Exception in getBalanceHistory', { userId, startDate, endDate });
    return [];
  }
}

/**
 * Migrate existing global balance to new system
 * This should be called once during migration
 */
export async function migrateExistingBalance(userId: string, existingBalance: number): Promise<void> {
  try {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Create initial snapshot for today
    await setBalanceForDate(userId, today, existingBalance);
    
    // Set current balance
    await setCurrentBalance(userId, existingBalance);
    
    logger.info('Balance migration completed', { userId, balance: existingBalance });
  } catch (err) {
    logger.logError(err, 'Error migrating existing balance', { userId, existingBalance });
    throw err;
  }
} 