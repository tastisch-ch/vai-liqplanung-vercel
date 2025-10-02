import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { startOfYear, endOfYear } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year') || new Date().getFullYear());
    const supabase = createRouteHandlerSupabaseClient(request);

    // Read latest revenue target for the year
    const { data: targetRows, error: targetErr } = await supabase
      .from('revenue_targets')
      .select('year,target_amount,updated_at,updated_by_email,updated_by')
      .eq('year', year)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (targetErr) {
      return NextResponse.json({ error: targetErr.message }, { status: 500 });
    }

    const targetRow = Array.isArray(targetRows) && targetRows.length > 0 ? targetRows[0] : null;
    const targetAmount = targetRow ? Number((targetRow as any).target_amount ?? 0) : 0;

    // Sum achieved incoming (exclude simulations) within the year
    const from = startOfYear(new Date(year, 0, 1)).toISOString();
    const to = endOfYear(new Date(year, 11, 31)).toISOString();

    const { data: amounts, error: amtErr } = await supabase
      .from('buchungen')
      .select('amount,direction,is_simulation,date')
      .gte('date', from)
      .lte('date', to);

    if (amtErr) {
      return NextResponse.json({ error: amtErr.message }, { status: 500 });
    }

    const achieved = (amounts || [])
      .filter((r: any) => r.direction === 'Incoming' && !r.is_simulation)
      .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    const remaining = Math.max(0, targetAmount - achieved);
    const progress = targetAmount > 0 ? Math.min(100, (achieved / targetAmount) * 100) : 0;

    return NextResponse.json({
      year,
      target: targetAmount,
      achieved,
      remaining,
      progress,
      updated_at: targetRow?.updated_at ?? null,
      updated_by_email: targetRow?.updated_by_email ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


