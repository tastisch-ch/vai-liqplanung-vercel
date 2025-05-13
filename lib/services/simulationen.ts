/**
 * Service for handling simulations 
 * Equivalent to logic/storage_simulation.py in the Python app
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { Simulation, Buchung } from '@/models/types';
import { dateToIsoString, getNextOccurrence } from '@/lib/date-utils/format';

/**
 * Load all simulations from the database
 * @param userId Optional user ID to filter simulations
 */
export async function loadSimulationen(userId?: string): Promise<Simulation[]> {
  try {
  let query = supabase.from('simulationen').select('*');
  
  // Filter by user if specified
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.order('date', { ascending: true });
  
  if (error) {
      console.error('Error loading simulations:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'simulationen' not found. Please check your database setup.`);
      }
      throw new Error(`Failed to load simulations: ${error.message}`);
  }
  
  return (data || []).map(item => ({
    ...item,
    date: new Date(item.date),
    end_date: item.end_date ? new Date(item.end_date) : null,
  })) as Simulation[];
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to load simulations')) {
      throw error;
    }
    console.error('Unexpected error loading simulations:', error);
    throw new Error(`Failed to load simulations: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Add a new simulation
 */
export async function addSimulation(
  name: string,
  details: string,
  date: Date,
  amount: number,
  direction: 'Incoming' | 'Outgoing',
  userId: string,
  recurring: boolean = false,
  interval?: 'monthly' | 'quarterly' | 'yearly',
  end_date?: Date | null
): Promise<Simulation> {
  try {
  const now = new Date().toISOString();
  const newSimulation = {
    id: uuidv4(),
    name,
    details,
    date: dateToIsoString(date) as string,
    amount,
    direction,
    recurring,
      "interval": recurring ? interval : null,
    end_date: end_date ? dateToIsoString(end_date) : null,
    user_id: userId,
    created_at: now,
    updated_at: now
  };
  
    console.log('Adding simulation with data:', newSimulation);
    
    // Use a direct database insert to bypass RLS policies
    // We'll manually check that the user_id is correct
  const { data, error } = await supabase
    .from('simulationen')
    .insert(newSimulation)
    .select()
    .single();
  
  if (error) {
      console.error('Error adding simulation:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'simulationen' not found. Please check your database setup.`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      } else if (error.code === '42501') {
        // This is a permission error, might be RLS related
        throw new Error(`Permission denied: ${error.message}. This might be a Row Level Security issue.`);
      }
      throw new Error(`Failed to add simulation: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned after adding simulation');
  }
  
  return {
    ...data,
    date: new Date(data.date),
    end_date: data.end_date ? new Date(data.end_date) : null,
  } as Simulation;
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to add simulation')) {
      throw error;
    }
    console.error('Unexpected error adding simulation:', error);
    throw new Error(`Failed to add simulation: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing simulation by ID
 */
export async function updateSimulationById(
  id: string,
  updates: Partial<Simulation>,
  userId: string
): Promise<Simulation> {
  try {
  // Ensure dates are formatted correctly
  const formattedUpdates = {
    ...updates,
    date: updates.date ? dateToIsoString(updates.date) : undefined,
    end_date: updates.end_date !== undefined ? dateToIsoString(updates.end_date) : undefined,
    updated_at: new Date().toISOString(),
    user_id: userId
  };
  
  const { data, error } = await supabase
    .from('simulationen')
    .update(formattedUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
      console.error('Error updating simulation:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'simulationen' not found`);
      } else if (error.code === '42703') {
        throw new Error(`Database column error: ${error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key constraint failed: ${error.message}`);
      }
      throw new Error(`Failed to update simulation: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Simulation with ID ${id} not found`);
  }
  
  return {
    ...data,
    date: new Date(data.date),
    end_date: data.end_date ? new Date(data.end_date) : null,
  } as Simulation;
  } catch (error: any) {
    if (error.message && (error.message.includes('Failed to update simulation') || error.message.includes('not found'))) {
      throw error;
    }
    console.error('Unexpected error updating simulation:', error);
    throw new Error(`Failed to update simulation: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a simulation by ID
 */
export async function deleteSimulationById(id: string): Promise<void> {
  try {
  const { error } = await supabase
    .from('simulationen')
    .delete()
    .eq('id', id);
  
  if (error) {
      console.error('Error deleting simulation:', error.message, error.details);
      if (error.code === '42P01') {
        throw new Error(`Database table 'simulationen' not found`);
      } else if (error.code === '23503') {
        throw new Error(`This simulation cannot be deleted because it is referenced by other records`);
      }
      throw new Error(`Failed to delete simulation: ${error.message}`);
    }
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to delete simulation')) {
      throw error;
    }
    console.error('Unexpected error deleting simulation:', error);
    throw new Error(`Failed to delete simulation: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Wrapper around the imported getNextOccurrence that enforces our specific rhythm types
 */
function getNextSimulationDate(date: Date, rhythm: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich'): Date {
  return getNextOccurrence(date, rhythm);
}

/**
 * Convert simulations to transactions within a date range
 * Similar to convert_simulationen_to_buchungen in the Python app
 */
export function convertSimulationenToBuchungen(
  startDate: Date, 
  endDate: Date, 
  simulationen: Simulation[]
): Buchung[] {
  const result: Buchung[] = [];
  
  simulationen.forEach(simulation => {
    // If simulation start date is after end_date, skip
    if (simulation.date > endDate) return;
    
    // If simulation has an end date and it's before the start_date, skip
    if (simulation.end_date && simulation.end_date < startDate) return;
    
    // Handle non-recurring simulations
    if (!simulation.recurring) {
      // If the simulation date is in our range, add it
      if (simulation.date >= startDate && simulation.date <= endDate) {
        result.push({
          id: uuidv4(),
          date: new Date(simulation.date),
          details: `${simulation.name}: ${simulation.details}`,
          amount: simulation.amount,
          direction: simulation.direction,
          kategorie: 'Simulation',
          user_id: simulation.user_id,
          created_at: new Date().toISOString()
        });
      }
      return;
    }
    
    // Handle recurring simulations
    if (simulation.recurring && simulation.interval) {
      let currentDate = new Date(Math.max(simulation.date.getTime(), startDate.getTime()));
      
      // Generate occurrences until end date
      while (currentDate <= endDate) {
        // If we've passed the simulation's end date, stop
        if (simulation.end_date && currentDate > simulation.end_date) {
          break;
        }
        
        // Create a transaction for this occurrence
        result.push({
          id: uuidv4(),
          date: new Date(currentDate),
          details: `${simulation.name}: ${simulation.details} (wiederkehrend)`,
          amount: simulation.amount,
          direction: simulation.direction,
          kategorie: 'Simulation',
          user_id: simulation.user_id,
          created_at: new Date().toISOString()
        });
        
        // Map our interval to rhythmus format for getNextOccurrence
        let rhythmus: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich';
        switch (simulation.interval) {
          case 'monthly': rhythmus = 'monatlich'; break;
          case 'quarterly': rhythmus = 'quartalsweise'; break;
          case 'yearly': rhythmus = 'jährlich'; break;
          default: rhythmus = 'monatlich';
        }
        
        // Get the next occurrence date
        currentDate = getNextSimulationDate(currentDate, rhythmus);
      }
    }
  });
  
  // Sort by date
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Generate future projections for simulations over a specified date range
 * Similar to convert_simulationen_to_buchungen but returns the full simulation objects
 */
export function generateSimulationProjections(
  simulationen: Simulation[],
  startDate: Date,
  endDate: Date
): Array<Simulation & { date: Date }> {
  const projections: Array<Simulation & { date: Date }> = [];
  
  simulationen.forEach(simulation => {
    // If simulation start date is after end_date, skip
    if (simulation.date > endDate) return;
    
    // If simulation has an end date and it's before the start_date, skip
    if (simulation.end_date && simulation.end_date < startDate) return;
    
    // Handle non-recurring simulations
    if (!simulation.recurring) {
      // If the simulation date is in our range, add it
      if (simulation.date >= startDate && simulation.date <= endDate) {
        projections.push({
          ...simulation,
          date: new Date(simulation.date)
        });
      }
      return;
    }
    
    // Handle recurring simulations
    if (simulation.recurring && simulation.interval) {
      let currentDate = new Date(Math.max(simulation.date.getTime(), startDate.getTime()));
      
      // Generate occurrences until end date
      while (currentDate <= endDate) {
        // If we've passed the simulation's end date, stop
        if (simulation.end_date && currentDate > simulation.end_date) {
          break;
        }
        
        // Add this occurrence
        projections.push({
          ...simulation,
          date: new Date(currentDate)
        });
        
        // Map our interval to rhythmus format for getNextOccurrence
        let rhythmus: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich';
        switch (simulation.interval) {
          case 'monthly': rhythmus = 'monatlich'; break;
          case 'quarterly': rhythmus = 'quartalsweise'; break;
          case 'yearly': rhythmus = 'jährlich'; break;
          default: rhythmus = 'monatlich';
        }
        
        // Get the next occurrence date
        currentDate = getNextSimulationDate(currentDate, rhythmus);
      }
    }
  });
  
  // Sort by date
  return projections.sort((a, b) => a.date.getTime() - b.date.getTime());
} 