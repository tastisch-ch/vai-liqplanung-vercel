/**
 * Service for handling user settings (like starting balance and design preferences)
 * TEMPORARY: All functions return default values without accessing the database
 */

import { DesignSettings } from '@/models/types';

// Default values for settings
const DEFAULT_SETTINGS = {
  start_balance: 0,
  primary_color: '#4A90E2',
  secondary_color: '#111',
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

/**
 * Get default user settings without saving to DB
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
 * Load user settings - TEMPORARY: returns default settings without DB access
 * @param userId User ID to load settings for
 */
export async function loadUserSettings(userId: string): Promise<UserSettings> {
  return getDefaultUserSettings(userId);
}

/**
 * Create default settings for a new user - TEMPORARY: returns default without DB access
 */
async function createDefaultSettings(userId: string): Promise<UserSettings> {
  return getDefaultUserSettings(userId);
}

/**
 * Update the starting balance for a user - TEMPORARY: returns provided balance without DB access
 */
export async function updateStartBalance(userId: string, balance: number): Promise<number> {
  return balance;
}

/**
 * Update design settings for a user - TEMPORARY: returns provided settings without DB access
 */
export async function updateDesignSettings(
  userId: string, 
  settings: DesignSettings
): Promise<DesignSettings> {
  return settings;
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
 * This is equivalent to the Python app's apply_custom_styles function
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