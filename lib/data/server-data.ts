import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Database } from '@/lib/types/supabase';
import { Buchung } from '@/models/types';
import { shiftPastDueDateIfNeeded } from '@/lib/services/buchungen';

// Types
type BuchungDB = Database['public']['Tables']['buchungen']['Row'];
type FixkostenDB = Database['public']['Tables']['fixkosten']['Row'];
type MitarbeiterDB = Database['public']['Tables']['mitarbeiter']['Row'];
type Lohn = Database['public']['Tables']['loehne']['Row'];
type Simulation = Database['public']['Tables']['simulationen']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

// Buchungen (Transactions) Data
export async function getBuchungen() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('buchungen')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  // Process the data to shift any past due dates
  return data.map(item => {
    // Convert the database record to our internal Buchung type
    const transaction: Buchung = {
      ...item,
      date: new Date(item.date),
      modified: item.modified || false,
      kategorie: item.kategorie || undefined,
      created_at: item.created_at || new Date().toISOString(),
      user_id: item.user_id || ''
    };
    
    // Apply date shifting for Incoming transactions
    if (transaction.direction === 'Incoming') {
      return shiftPastDueDateIfNeeded(transaction);
    }
    
    return transaction;
  });
}

export async function getBuchungById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('buchungen')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching transaction ${id}:`, error);
    throw new Error(`Failed to fetch transaction: ${error.message}`);
  }

  return data;
}

// Fixkosten (Fixed Costs) Data
export async function getFixkosten() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('fixkosten')
    .select('*')
    .order('start', { ascending: false });

  if (error) {
    console.error('Error fetching fixed costs:', error);
    throw new Error(`Failed to fetch fixed costs: ${error.message}`);
  }

  return data;
}

export async function getFixkostenById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('fixkosten')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching fixed cost ${id}:`, error);
    throw new Error(`Failed to fetch fixed cost: ${error.message}`);
  }

  return data;
}

// Mitarbeiter (Employees) Data
export async function getMitarbeiter() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('mitarbeiter')
    .select('*')
    .order('nachname', { ascending: true });

  if (error) {
    console.error('Error fetching employees:', error);
    throw new Error(`Failed to fetch employees: ${error.message}`);
  }

  return data;
}

export async function getMitarbeiterById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('mitarbeiter')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching employee ${id}:`, error);
    throw new Error(`Failed to fetch employee: ${error.message}`);
  }

  return data;
}

// Löhne (Salaries) Data
export async function getLoehne() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('loehne')
    .select('*, mitarbeiter(vorname, nachname)')
    .order('datum', { ascending: false });

  if (error) {
    console.error('Error fetching salaries:', error);
    throw new Error(`Failed to fetch salaries: ${error.message}`);
  }

  return data;
}

export async function getLoehneByMitarbeiterId(mitarbeiterId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('loehne')
    .select('*')
    .eq('mitarbeiter_id', mitarbeiterId)
    .order('datum', { ascending: false });

  if (error) {
    console.error(`Error fetching salaries for employee ${mitarbeiterId}:`, error);
    throw new Error(`Failed to fetch employee salaries: ${error.message}`);
  }

  return data;
}

export async function getLohnById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('loehne')
    .select('*, mitarbeiter(vorname, nachname)')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching salary ${id}:`, error);
    throw new Error(`Failed to fetch salary: ${error.message}`);
  }

  return data;
}

// Simulationen (Simulations) Data
export async function getSimulationen() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('simulationen')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching simulations:', error);
    throw new Error(`Failed to fetch simulations: ${error.message}`);
  }

  return data;
}

export async function getSimulationById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('simulationen')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching simulation ${id}:`, error);
    throw new Error(`Failed to fetch simulation: ${error.message}`);
  }

  return data;
}

export async function getActiveSimulation() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('simulationen')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching active simulation:', error);
    throw new Error(`Failed to fetch active simulation: ${error.message}`);
  }

  return data || null;
}

// User Settings Data
export async function getUserSettings() {
  const supabase = await createServerSupabaseClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching user settings:', error);
    throw new Error(`Failed to fetch user settings: ${error.message}`);
  }

  return data || null;
}

// Get user and profile details
export async function getUserProfile() {
  const supabase = await createServerSupabaseClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get user profile
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user profile:', error);
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }
  
  return {
    user,
    profile: data || null
  };
} 