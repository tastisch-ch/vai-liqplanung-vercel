/**
 * Service for handling saved simulation scenarios
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase/client';
import { SavedScenario } from '@/models/types';

/**
 * Load all scenarios from the database
 * @param userId Optional user ID to filter scenarios
 */
export async function loadScenarios(userId?: string): Promise<SavedScenario[]> {
  let query = supabase.from('scenarios').select('*');
  
  // Filter by user if specified
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading scenarios:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    ...item,
    simulationIds: item.simulation_ids,
    projectionMonths: item.projection_months
  })) as SavedScenario[];
}

/**
 * Save a new scenario
 */
export async function saveScenario(
  name: string,
  simulationIds: string[],
  userId: string,
  projectionMonths: number = 12,
  description?: string
): Promise<SavedScenario> {
  const now = new Date().toISOString();
  const newScenario = {
    id: uuidv4(),
    name,
    description: description || null,
    simulation_ids: simulationIds,
    projection_months: projectionMonths,
    user_id: userId,
    created_at: now,
    updated_at: now
  };
  
  const { data, error } = await supabase
    .from('scenarios')
    .insert(newScenario)
    .select()
    .single();
  
  if (error) {
    console.error('Error saving scenario:', error);
    return {
      ...newScenario,
      simulationIds: newScenario.simulation_ids,
      projectionMonths: newScenario.projection_months
    } as SavedScenario;
  }
  
  return {
    ...data,
    simulationIds: data.simulation_ids,
    projectionMonths: data.projection_months
  } as SavedScenario;
}

/**
 * Update an existing scenario
 */
export async function updateScenario(
  id: string,
  updates: Partial<SavedScenario>,
  userId: string
): Promise<SavedScenario> {
  const updatedFields: any = {
    updated_at: new Date().toISOString(),
    user_id: userId
  };
  
  // Map fields to database column names
  if (updates.name !== undefined) updatedFields.name = updates.name;
  if (updates.description !== undefined) updatedFields.description = updates.description;
  if (updates.simulationIds !== undefined) updatedFields.simulation_ids = updates.simulationIds;
  if (updates.projectionMonths !== undefined) updatedFields.projection_months = updates.projectionMonths;
  
  const { data, error } = await supabase
    .from('scenarios')
    .update(updatedFields)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating scenario:', error);
    return {
      id,
      ...updates,
      user_id: userId,
      created_at: new Date().toISOString()
    } as SavedScenario;
  }
  
  return {
    ...data,
    simulationIds: data.simulation_ids,
    projectionMonths: data.projection_months
  } as SavedScenario;
}

/**
 * Delete a scenario
 */
export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting scenario:', error);
  }
} 