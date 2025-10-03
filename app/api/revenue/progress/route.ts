import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { startOfYear, endOfYear } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year') || new Date().getFullYear());
    const debug = searchParams.get('debug') === '1';
    // Prefer server-session/anon client; if it fails, fall back to service-role client (if configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
    const sessionClient = createRouteHandlerSupabaseClient(request);

    async function computeWith(client: any) {
      const { data: targetRows, error: targetErr } = await client
        .from('revenue_targets')
        .select('year,target_amount,updated_at,updated_by_email,updated_by')
        .eq('year', year)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (targetErr) throw targetErr;

      const targetRow = Array.isArray(targetRows) && targetRows.length > 0 ? targetRows[0] : null;
      const targetAmount = targetRow ? Number((targetRow as any).target_amount ?? 0) : 0;

      const from = startOfYear(new Date(year, 0, 1)).toISOString();
      const to = endOfYear(new Date(year, 11, 31)).toISOString();
      const { data: amounts, error: amtErr } = await client
        .from('buchungen')
        .select('amount,direction,is_simulation,date')
        .gte('date', from)
        .lte('date', to);
      if (amtErr) throw amtErr;

      const achieved = (amounts || [])
        .filter((r: any) => r.direction === 'Incoming' && !r.is_simulation)
        .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

      const remaining = Math.max(0, targetAmount - achieved);
      const progress = targetAmount > 0 ? Math.min(100, (achieved / targetAmount) * 100) : 0;

      // Open invoices sum (Geplant): incoming invoices still open in current year
      const { data: openInvoices, error: openErr } = await client
        .from('buchungen')
        .select('amount,direction,is_invoice,invoice_status,date')
        .eq('is_invoice', true)
        .eq('invoice_status', 'open')
        .eq('direction', 'Incoming')
        .gte('date', from)
        .lte('date', to);
      if (openErr) throw openErr;
      const openInvoicesSum = (openInvoices || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      return {
        year,
        target: targetAmount,
        achieved,
        remaining,
        progress,
        open_invoices_sum: openInvoicesSum,
        updated_at: targetRow?.updated_at ?? null,
        updated_by_email: targetRow?.updated_by_email ?? null,
      };
    }

    let result: any;
    let mode: 'session' | 'service' = 'session';
    try {
      // Try with session/anon first (works when RLS is disabled)
      result = await computeWith(sessionClient);
    } catch (err: any) {
      if (serviceKey) {
        const serviceClient = createClient(supabaseUrl, serviceKey);
        mode = 'service';
        result = await computeWith(serviceClient);
      } else {
        return NextResponse.json({ error: err?.message || 'Error', mode, hasServiceKey: false }, { status: 500 });
      }
    }

    return NextResponse.json(debug ? { ...result, mode, hasServiceKey: !!serviceKey && serviceKey.length > 10 } : result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


