'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/types/supabase';
import { revalidatePath } from 'next/cache';

// Types
type Buchung = Database['public']['Tables']['buchungen']['Row'];
type FixKosten = Database['public']['Tables']['fixkosten']['Row'];
type Mitarbeiter = Database['public']['Tables']['mitarbeiter']['Row'];
type Lohn = Database['public']['Tables']['loehne']['Row'];
type Simulation = Database['public']['Tables']['simulationen']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

// Helper to get current user ID
async function getCurrentUserId() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// Buchungen (Transactions) Actions
export async function createBuchung(
  formData: Omit<Buchung, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { is_simulation?: boolean }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('buchungen')
      .insert({
        ...formData,
        id: uuidv4(),
        user_id: userId,
        updated_at: new Date().toISOString(),
        is_simulation: formData.is_simulation ?? false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath('/buchungen');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function updateBuchung(
  id: string,
  updates: Partial<Buchung>
) {
  try {
    const supabase = await createServerSupabaseClient();
    
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
    
    revalidatePath('/buchungen');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteBuchung(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('buchungen')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/buchungen');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: error.message };
  }
}

// Fixkosten (Fixed Costs) Actions
export async function createFixkosten(
  formData: Omit<FixKosten, 'id' | 'created_at' | 'updated_at' | 'user_id'>
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('fixkosten')
      .insert({
        ...formData,
        id: uuidv4(),
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath('/fixkosten');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating fixed cost:', error);
    return { success: false, error: error.message };
  }
}

export async function updateFixkosten(
  id: string,
  updates: Partial<FixKosten>
) {
  try {
    const supabase = await createServerSupabaseClient();
    
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
    
    revalidatePath('/fixkosten');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating fixed cost:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteFixkosten(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('fixkosten')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/fixkosten');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting fixed cost:', error);
    return { success: false, error: error.message };
  }
}

// Mitarbeiter (Employees) Actions
export async function createMitarbeiter(
  formData: Omit<Mitarbeiter, 'id' | 'created_at' | 'updated_at' | 'user_id'>
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('mitarbeiter')
      .insert({
        ...formData,
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath('/mitarbeiter');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return { success: false, error: error.message };
  }
}

export async function updateMitarbeiter(
  id: string,
  updates: Partial<Mitarbeiter>
) {
  try {
    const supabase = await createServerSupabaseClient();
    
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
    
    revalidatePath('/mitarbeiter');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating employee:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteMitarbeiter(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('mitarbeiter')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/mitarbeiter');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return { success: false, error: error.message };
  }
}

// Löhne (Salaries) Actions
export async function createLohn(
  formData: Omit<Lohn, 'id' | 'created_at' | 'updated_at' | 'user_id'>
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('loehne')
      .insert({
        ...formData,
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath('/loehne');
    revalidatePath(`/mitarbeiter/${formData.mitarbeiter_id}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating salary:', error);
    return { success: false, error: error.message };
  }
}

export async function updateLohn(
  id: string,
  updates: Partial<Lohn>
) {
  try {
    const supabase = await createServerSupabaseClient();
    
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
    
    revalidatePath('/loehne');
    if (data?.mitarbeiter_id) {
      revalidatePath(`/mitarbeiter/${data.mitarbeiter_id}`);
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating salary:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteLohn(id: string, mitarbeiterId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('loehne')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/loehne');
    revalidatePath(`/mitarbeiter/${mitarbeiterId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting salary:', error);
    return { success: false, error: error.message };
  }
}

// Simulationen (Simulations) Actions
export async function createSimulation(
  formData: Omit<Simulation, 'id' | 'created_at' | 'updated_at' | 'user_id'>
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('simulationen')
      .insert({
        ...formData,
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath('/simulationen');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating simulation:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSimulation(
  id: string,
  updates: Partial<Simulation>
) {
  try {
    const supabase = await createServerSupabaseClient();
    
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
    
    revalidatePath('/simulationen');
    revalidatePath(`/simulationen/${id}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating simulation:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteSimulation(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('simulationen')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/simulationen');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting simulation:', error);
    return { success: false, error: error.message };
  }
}

export async function setActiveSimulation(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // First deactivate all simulations
    const { error: resetError } = await supabase
      .from('simulationen')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (resetError) throw resetError;
    
    // Then activate the specified simulation
    const { data, error } = await supabase
      .from('simulationen')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath('/simulationen');
    revalidatePath('/dashboard');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error setting active simulation:', error);
    return { success: false, error: error.message };
  }
}

// User Settings Actions
export async function updateUserSettings(settings: Partial<UserSettings>) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating user settings:', error);
    return { success: false, error: error.message };
  }
} 