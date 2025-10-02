export interface Buchung {
  id: string;
  date: Date;
  original_date?: Date; // preserves original date when shifted
  details: string;
  amount: number;
  direction: 'Incoming' | 'Outgoing';
  modified?: boolean;
  shifted?: boolean;
  kategorie?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  isOverridden?: boolean;
  overrideNotes?: string;
  is_simulation?: boolean;
  // Invoice lifecycle (optional; present for imported invoices)
  is_invoice?: boolean;
  invoice_id?: string | null;
  invoice_status?: 'open' | 'paid' | 'canceled' | string;
  paid_at?: Date | string | null;
  last_seen_at?: Date | string | null;
}

export interface Fixkosten {
  id: string;
  name: string;
  betrag: number;
  rhythmus: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich';
  start: Date;
  enddatum: Date | null;
  user_id: string;
  kategorie?: string;
  created_at: string;
  updated_at: string;
}

export interface LohnDaten {
  id: string;
  mitarbeiter_id: string;
  Start: Date;
  Ende: Date | null;
  Betrag: number;
  created_at: string;
  updated_at: string;
}

export interface Mitarbeiter {
  id: string;
  Name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Extended Mitarbeiter type with Lohn data
export interface MitarbeiterWithLohn extends Mitarbeiter {
  Lohn: LohnDaten[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  read_only?: boolean;
  created_at: string;
}

export interface Simulation {
  id: string;
  name: string;
  details: string;
  date: Date;
  amount: number;
  direction: 'Incoming' | 'Outgoing';
  recurring: boolean;
  interval: 'monthly' | 'quarterly' | 'yearly' | null;
  end_date: Date | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  is_authenticated: boolean;
  user: User | null;
  is_admin: boolean;
  is_read_only: boolean;
}

export interface DesignSettings {
  primary_color: string;
  secondary_color: string;
  background_color: string;
}

// Transaction types for visual styling
export type TransactionCategory = 'Standard' | 'Fixkosten' | 'Lohn' | 'Simulation';

// Transaction marker types
export interface TransactionMarker {
  icon: string;
  label: string;
  category: TransactionCategory;
}

// Saved simulation scenario
export interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  simulationIds: string[]; // Maps to simulation_ids in the database
  projectionMonths: number; // Maps to projection_months in the database
  user_id: string;
  created_at: string;
  updated_at?: string;
}

// New type for fixkosten overrides (exceptions)
export interface FixkostenOverride {
  id: string;
  fixkosten_id: string;
  original_date: Date;
  new_date: Date | null;
  original_amount: number;
  new_amount: number | null;
  is_skipped?: boolean;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  start_balance: number;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  created_at: string;
  updated_at: string;
}

// Daily balance snapshot types
export interface DailyBalanceSnapshot {
  id: string;
  date: Date;
  balance: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CurrentBalance {
  user_id: string;
  balance: number;
  effective_date: Date;
  updated_at: string;
}

// Combined transaction type with calculated fields
export interface EnhancedTransaction extends Buchung {
  kontostand?: number;
  hinweis?: string;
  kategorie: TransactionCategory;
  signedAmount?: number;
} 