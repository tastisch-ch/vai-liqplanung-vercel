'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/types/supabase';

// Basic types
type Buchung = Database['public']['Tables']['buchungen']['Row'];
type Fixkosten = Database['public']['Tables']['fixkosten']['Row'];
type Mitarbeiter = Database['public']['Tables']['mitarbeiter']['Row'];
type Lohn = Database['public']['Tables']['loehne']['Row'];
type Simulation = Database['public']['Tables']['simulationen']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

// Generic state type for all hooks
interface DataState<T> {
  data: T[] | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

interface SingleDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

// Type for service responses
type ServiceResponse<T> = 
  | { data: T; error?: never }
  | { data?: never; error: { message: string } };

// Hook for fetching Buchungen (transactions)
export function useBuchungen(): DataState<Buchung> {
  const [data, setData] = useState<Buchung[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buchungen')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching transactions');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching a single Buchung by ID
export function useBuchungById(id: string): SingleDataState<Buchung> {
  const [data, setData] = useState<Buchung | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) {
      setError('No transaction ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buchungen')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the transaction');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching Fixkosten (fixed costs)
export function useFixkosten(): DataState<Fixkosten> {
  const [data, setData] = useState<Fixkosten[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fixkosten')
        .select('*')
        .order('start', { ascending: false });

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching fixed costs');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching a single Fixkosten by ID
export function useFixkostenById(id: string): SingleDataState<Fixkosten> {
  const [data, setData] = useState<Fixkosten | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) {
      setError('No fixed cost ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fixkosten')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the fixed cost');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching Mitarbeiter (employees)
export function useMitarbeiter(): DataState<Mitarbeiter> {
  const [data, setData] = useState<Mitarbeiter[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mitarbeiter')
        .select('*')
        .order('nachname', { ascending: true });

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching employees');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching a single Mitarbeiter by ID
export function useMitarbeiterById(id: string): SingleDataState<Mitarbeiter> {
  const [data, setData] = useState<Mitarbeiter | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) {
      setError('No employee ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mitarbeiter')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the employee');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching Löhne (salaries)
export function useLoehne(): DataState<Lohn> {
  const [data, setData] = useState<Lohn[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loehne')
        .select('*, mitarbeiter(vorname, nachname)')
        .order('datum', { ascending: false });

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching salaries');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching Löhne by Mitarbeiter ID
export function useLoehneByMitarbeiter(mitarbeiterId: string): DataState<Lohn> {
  const [data, setData] = useState<Lohn[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!mitarbeiterId) {
      setError('No employee ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loehne')
        .select('*')
        .eq('mitarbeiter_id', mitarbeiterId)
        .order('datum', { ascending: false });

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching employee salaries');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mitarbeiterId]);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching Simulationen (simulations)
export function useSimulationen(): DataState<Simulation> {
  const [data, setData] = useState<Simulation[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('simulationen')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching simulations');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching active Simulation
export function useActiveSimulation(): SingleDataState<Simulation> {
  const [data, setData] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('simulationen')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching active simulation');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refreshData: fetchData };
}

// Hook for fetching User Settings
export function useUserSettings(): SingleDataState<UserSettings> {
  const [data, setData] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current user first
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        setError(error.message);
        setData(null);
      } else {
        setData(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching user settings');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refreshData: fetchData };
} 