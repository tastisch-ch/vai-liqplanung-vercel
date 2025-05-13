export interface Buchung {
  id: string;
  date: Date;
  details: string;
  amount: number;
  direction: 'Incoming' | 'Outgoing';
  modified?: boolean;
  shifted?: boolean;
  kategorie?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export interface Fixkosten {
  id: string;
  name: string;
  betrag: number;
  rhythmus: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich';
  start: Date;
  enddatum?: Date | null;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export interface LohnDaten {
  id: string;
  Start: Date;
  Ende?: Date | null;
  Betrag: number;
}

export interface Mitarbeiter {
  id: string;
  Name: string;
  Lohn: LohnDaten[];
  user_id: string;
  created_at: string;
  updated_at?: string;
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
  recurring?: boolean;
  interval?: 'monthly' | 'quarterly' | 'yearly';
  end_date?: Date | null;
  user_id: string;
  created_at: string;
  updated_at?: string;
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
export type TransactionCategory = 'Standard' | 'Fixkosten' | 'Simulation' | 'Lohn';

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

// Combined transaction type with calculated fields
export interface EnhancedTransaction extends Buchung {
  kontostand?: number;
  hinweis?: string;
  kategorie: TransactionCategory;
} 