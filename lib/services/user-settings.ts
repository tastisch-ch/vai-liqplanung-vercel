/**
 * Service for managing user settings and preferences
 */

import { supabase } from '@/lib/supabase/client';
import { UserSettings } from '@/models/types';
import { getCurrentBalance, setCurrentBalance } from './daily-balance-client';

// Default settings for new users
const DEFAULT_SETTINGS = {
  start_balance: 0,
  primary_color: '#4A90E2',
  secondary_color: '#111',
  background_color: '#FFFFFF'
};

/**
 * Load user settings from database
 */
export async function loadUserSettings(userId: string): Promise<UserSettings> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Error loading user settings:', error);
      return getDefaultUserSettings(userId);
    }
    
    // Get current balance from daily balance system
    const currentBalance = await getCurrentBalance(userId);
    
    return {
      user_id: data.user_id,
      start_balance: currentBalance.balance, // Use current balance from daily system
      primary_color: data.primary_color || DEFAULT_SETTINGS.primary_color,
      secondary_color: data.secondary_color || DEFAULT_SETTINGS.secondary_color,
      background_color: data.background_color || DEFAULT_SETTINGS.background_color,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (err) {
    console.error('Exception in loadUserSettings:', err);
    return getDefaultUserSettings(userId);
  }
}

/**
 * Get default user settings
 */
export function getDefaultUserSettings(userId: string): UserSettings {
  return {
    user_id: userId,
    start_balance: DEFAULT_SETTINGS.start_balance,
    primary_color: DEFAULT_SETTINGS.primary_color,
    secondary_color: DEFAULT_SETTINGS.secondary_color,
    background_color: DEFAULT_SETTINGS.background_color,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Update user settings
 */
export async function updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        primary_color: updates.primary_color,
        secondary_color: updates.secondary_color,
        background_color: updates.background_color,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('*')
      .single();
      
    if (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
    
    // If balance is being updated, use the daily balance system
    if (updates.start_balance !== undefined) {
      await setCurrentBalance(userId, updates.start_balance);
    }
    
    // Get the updated settings with current balance
    return await loadUserSettings(userId);
  } catch (err) {
    console.error('Exception in updateUserSettings:', err);
    throw err;
  }
}

/**
 * Get the current balance using the daily balance system
 * @deprecated Use getCurrentBalance from daily-balance service instead
 */
export async function getGlobalKontostand(): Promise<{ balance: number; lastUpdated: string | null }> {
  try {
    // This function is deprecated - use getCurrentBalance instead
    console.warn('getGlobalKontostand is deprecated, use getCurrentBalance instead');
    
    // For backward compatibility, we need a userId - this is a limitation
    // In the future, this should be removed and replaced with getCurrentBalance(userId)
    return { 
      balance: DEFAULT_SETTINGS.start_balance, 
      lastUpdated: null 
    };
  } catch (err) {
    console.error('Exception in getGlobalKontostand:', err);
    return { 
      balance: DEFAULT_SETTINGS.start_balance, 
      lastUpdated: null 
    };
  }
}

/**
 * Update the current balance using the daily balance system
 * @deprecated Use setCurrentBalance from daily-balance service instead
 */
export async function updateGlobalKontostand(balance: number): Promise<{ balance: number; lastUpdated: string | null }> {
  try {
    // This function is deprecated - use setCurrentBalance instead
    console.warn('updateGlobalKontostand is deprecated, use setCurrentBalance instead');
    
    // For backward compatibility, we need a userId - this is a limitation
    // In the future, this should be removed and replaced with setCurrentBalance(userId, balance)
    return { balance, lastUpdated: new Date().toISOString() };
  } catch (err) {
    console.error('Exception in updateGlobalKontostand:', err);
    return { balance, lastUpdated: new Date().toISOString() };
  }
}

/**
 * Update the starting balance for a user
 * @deprecated Use setCurrentBalance from daily-balance service instead
 */
export async function updateStartBalance(userId: string, balance: number): Promise<number> {
  try {
    // Use the new daily balance system
    const result = await setCurrentBalance(userId, balance);
    return result.balance;
  } catch (err) {
    console.error('Exception in updateStartBalance:', err);
    return balance;
  }
}

/**
 * Get user settings - alias for loadUserSettings to maintain API consistency
 * @param userId User ID to load settings for 
 */
export const getUserSettings = async (userId: string): Promise<UserSettings> => {
  try {
    // Use the new daily balance system
    return await loadUserSettings(userId);
  } catch (err) {
    console.error('Exception in getUserSettings:', err);
    return getDefaultUserSettings(userId);
  }
}; 