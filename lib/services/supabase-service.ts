import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/types/supabase';
import { v4 as uuidv4 } from 'uuid';

// Types
type Buchung = Database['public']['Tables']['buchungen']['Row'];
type FixKosten = Database['public']['Tables']['fixkosten']['Row'];
type Mitarbeiter = Database['public']['Tables']['mitarbeiter']['Row'];
type Lohn = Database['public']['Tables']['loehne']['Row'];
type Simulation = Database['public']['Tables']['simulationen']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

// Error handling wrapper
const handleError = (error: any, operation: string) => {
  console.error(`Error in ${operation}:`, error);
  return {
    error: {
      message: `Failed to ${operation}: ${error.message || 'Unknown error'}`
    }
  };
};

// Buchungen (Transactions) Service
export const buchungenService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('buchungen')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch transactions');
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('buchungen')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch transaction');
    }
  },

  async create(buchung: Omit<Buchung, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
    try {
      const { data, error } = await supabase
        .from('buchungen')
        .insert({
          ...buchung,
          id: uuidv4(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'create transaction');
    }
  },

  async update(id: string, updates: Partial<Buchung>) {
    try {
      const { data, error } = await supabase
        .from('buchungen')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'update transaction');
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('buchungen')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return handleError(error, 'delete transaction');
    }
  }
};

// Fixkosten (Fixed Costs) Service
export const fixkostenService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('fixkosten')
        .select('*')
        .order('start', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch fixed costs');
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('fixkosten')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch fixed cost');
    }
  },

  async create(fixkosten: Omit<FixKosten, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
    try {
      const { data, error } = await supabase
        .from('fixkosten')
        .insert({
          ...fixkosten,
          id: uuidv4(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'create fixed cost');
    }
  },

  async update(id: string, updates: Partial<FixKosten>) {
    try {
      const { data, error } = await supabase
        .from('fixkosten')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'update fixed cost');
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('fixkosten')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return handleError(error, 'delete fixed cost');
    }
  }
};

// Mitarbeiter (Employees) Service
export const mitarbeiterService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('mitarbeiter')
        .select('*')
        .order('nachname', { ascending: true });

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch employees');
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('mitarbeiter')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch employee');
    }
  },

  async create(mitarbeiter: Omit<Mitarbeiter, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
    try {
      const { data, error } = await supabase
        .from('mitarbeiter')
        .insert({
          ...mitarbeiter,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'create employee');
    }
  },

  async update(id: string, updates: Partial<Mitarbeiter>) {
    try {
      const { data, error } = await supabase
        .from('mitarbeiter')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'update employee');
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('mitarbeiter')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return handleError(error, 'delete employee');
    }
  }
};

// Löhne (Salaries) Service
export const loehneService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('loehne')
        .select('*, mitarbeiter(vorname, nachname)')
        .order('datum', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch salaries');
    }
  },

  async getByMitarbeiterId(mitarbeiterId: string) {
    try {
      const { data, error } = await supabase
        .from('loehne')
        .select('*')
        .eq('mitarbeiter_id', mitarbeiterId)
        .order('datum', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch employee salaries');
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('loehne')
        .select('*, mitarbeiter(vorname, nachname)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch salary');
    }
  },

  async create(lohn: Omit<Lohn, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
    try {
      const { data, error } = await supabase
        .from('loehne')
        .insert({
          ...lohn,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'create salary');
    }
  },

  async update(id: string, updates: Partial<Lohn>) {
    try {
      const { data, error } = await supabase
        .from('loehne')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'update salary');
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('loehne')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return handleError(error, 'delete salary');
    }
  }
};

// Simulationen (Simulations) Service
export const simulationenService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('simulationen')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch simulations');
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('simulationen')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'fetch simulation');
    }
  },

  async getActive() {
    try {
      const { data, error } = await supabase
        .from('simulationen')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return { data };
    } catch (error) {
      return handleError(error, 'fetch active simulation');
    }
  },

  async create(simulation: Omit<Simulation, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
    try {
      const { data, error } = await supabase
        .from('simulationen')
        .insert({
          ...simulation,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'create simulation');
    }
  },

  async update(id: string, updates: Partial<Simulation>) {
    try {
      const { data, error } = await supabase
        .from('simulationen')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'update simulation');
    }
  },

  async setActive(id: string) {
    try {
      // First, deactivate all simulations
      const { error: resetError } = await supabase
        .from('simulationen')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (resetError) throw resetError;

      // Then activate the specified simulation
      const { data, error } = await supabase
        .from('simulationen')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'set active simulation');
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('simulationen')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return handleError(error, 'delete simulation');
    }
  }
};

// User Settings Service
export const userSettingsService = {
  async get() {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return { data };
    } catch (error) {
      return handleError(error, 'fetch user settings');
    }
  },

  async upsert(settings: Partial<UserSettings>) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.user.id,
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return handleError(error, 'update user settings');
    }
  }
}; 