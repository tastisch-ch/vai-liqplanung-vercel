/**
 * Service for handling user settings (like starting balance and design preferences)
 */

import { createClient } from '@/lib/supabase/client';
import { DesignSettings } from '@/models/types';

// Default values for settings
const DEFAULT_SETTINGS = {
  start_balance: 0,
  primary_color: '#02403D', // Updated to vaios brand color
  secondary_color: '#000',
  background_color: '#FFFFFF'
};

interface UserSettings {
  user_id: string;
  start_balance: number;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  created_at: string;
  updated_at: string | null;
}

const supabase = createClient();

/**
 * Get default user settings
 */
function getDefaultUserSettings(userId: string): UserSettings {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    ...DEFAULT_SETTINGS,
    created_at: now,
    updated_at: now
  };
}

/**
 * Load user settings from the database
 * @param userId User ID to load settings for
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
      // If no settings exist yet, create default ones
      return await createDefaultSettings(userId);
    }
    
    return data as UserSettings;
  } catch (err) {
    console.error('Exception in loadUserSettings:', err);
    return getDefaultUserSettings(userId);
  }
}

/**
 * Create default settings for a new user
 */
async function createDefaultSettings(userId: string): Promise<UserSettings> {
  const defaultSettings = getDefaultUserSettings(userId);
  
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .insert(defaultSettings)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating default settings:', error);
      return defaultSettings;
    }
    
    return data as UserSettings;
  } catch (err) {
    console.error('Exception in createDefaultSettings:', err);
    return defaultSettings;
  }
}

/**
 * Update the starting balance for a user
 */
export async function updateStartBalance(userId: string, balance: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .update({ 
        start_balance: balance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('start_balance')
      .single();
      
    if (error) {
      console.error('Error updating start balance:', error);
      return balance;
    }
    
    return data.start_balance;
  } catch (err) {
    console.error('Exception in updateStartBalance:', err);
    return balance;
  }
}

/**
 * Update design settings for a user
 */
export async function updateDesignSettings(
  userId: string, 
  settings: DesignSettings
): Promise<DesignSettings> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .update({ 
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        background_color: settings.background_color,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('primary_color, secondary_color, background_color')
      .single();
      
    if (error) {
      console.error('Error updating design settings:', error);
      return settings;
    }
    
    return data as DesignSettings;
  } catch (err) {
    console.error('Exception in updateDesignSettings:', err);
    return settings;
  }
}

/**
 * Get the default design settings
 */
export function getDefaultDesignSettings(): DesignSettings {
  return {
    primary_color: DEFAULT_SETTINGS.primary_color,
    secondary_color: DEFAULT_SETTINGS.secondary_color,
    background_color: DEFAULT_SETTINGS.background_color
  };
}

/**
 * Apply CSS custom properties for design settings
 */
export function getDesignStylesCSS(settings: DesignSettings): string {
  return `
    /* Bessere Margins für den Seiteninhalt */
    .main .block-container {
      padding-top: 2rem;
      margin-top: 0;
    }
    
    /* Verbesserte Darstellung von Elementen */
    div.stButton > button {
      width: 100%;
    }
    
    /* Optisches Trennen von Hauptbereichen */
    .main .element-container {
      margin-bottom: 1rem;
    }
    
    /* Formatierung für CHF-Inputs */
    input[data-testid="stTextInput"] {
      text-align: right;
    }
    
    /* Benutzerdefinierte Farbeinstellungen */
    :root {
      --primary-color: ${settings.primary_color};
      --secondary-color: ${settings.secondary_color};
      --background-color: ${settings.background_color};
      --accent-color: #D1F812;
      --light-teal: #ADC7C8;
      --lighter-gray: #DEE2E3;
    }
    
    body {
      background-color: var(--background-color);
    }
    
    .primary-bg {
      background-color: var(--primary-color) !important;
    }
    
    .primary-text {
      color: var(--primary-color) !important;
    }
    
    .secondary-text {
      color: var(--secondary-color) !important;
    }
    
    .accent-bg {
      background-color: var(--accent-color) !important;
    }
    
    .accent-text {
      color: var(--accent-color) !important;
    }
    
    /* Button Styling */
    .btn-primary {
      background-color: var(--primary-color);
      color: white;
    }
    
    .btn-primary:hover {
      background-color: var(--primary-color);
      opacity: 0.9;
    }
  `;
}

/**
 * Get user settings - alias for loadUserSettings to maintain API consistency
 * @param userId User ID to load settings for 
 */
export const getUserSettings = loadUserSettings; 