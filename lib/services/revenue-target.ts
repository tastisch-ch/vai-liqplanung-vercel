import { supabase } from '@/lib/supabase/client';
import { startOfYear, endOfYear } from 'date-fns';

export type RevenueTarget = {
  year: number;
  target_amount: number;
  updated_at: string;
  updated_by?: string | null;
  updated_by_email?: string | null;
};

export async function getRevenueTarget(year: number): Promise<RevenueTarget | null> {
  // Fetch as array (no object Accept header) to avoid 406 entirely
  const { data, error } = await supabase
    .from('revenue_targets')
    .select('year,target_amount,updated_at,updated_by,updated_by_email')
    .eq('year', year)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) return null;
  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return row as any;
}

export async function upsertRevenueTarget(year: number, amount: number, user?: { id?: string | null; email?: string | null }) {
  const { data, error } = await supabase
    .from('revenue_targets')
    .upsert({
      year,
      target_amount: amount,
      updated_by: user?.id || null,
      updated_by_email: user?.email || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'year' })
    .select('year,target_amount,updated_at,updated_by,updated_by_email')
    .single();
  if (error) throw error;
  return data as RevenueTarget;
}

export async function sumIncomingForYear(year: number): Promise<number> {
  const from = startOfYear(new Date(year, 0, 1)).toISOString();
  const to = endOfYear(new Date(year, 11, 31)).toISOString();
  const { data, error } = await supabase
    .from('buchungen')
    .select('amount,direction,is_simulation,date')
    .gte('date', from)
    .lte('date', to);
  if (error || !data) return 0;
  return (data as any[])
    .filter((r) => r.direction === 'Incoming' && !r.is_simulation)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

export async function getRevenueProgress(year: number) {
  const target = await getRevenueTarget(year);
  if (!target) return { target: 0, achieved: 0, remaining: 0, progress: 0 };
  const achieved = await sumIncomingForYear(year);
  const targetAmount = Number((target as any).target_amount ?? 0);
  const remaining = Math.max(0, targetAmount - achieved);
  const progress = targetAmount > 0 ? Math.min(100, (achieved / targetAmount) * 100) : 0;
  return { target: targetAmount, achieved, remaining, progress };
}


