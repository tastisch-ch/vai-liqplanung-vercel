'use client';

import { useState, useEffect, useMemo } from 'react';
import { addMonths, endOfMonth, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import { getCurrentBalance } from '@/lib/services/daily-balance';
import { enhanceTransactions } from '@/lib/services/buchungen';
import { EnhancedTransaction } from '@/models/types';
import { loadBuchungen } from '@/lib/services/buchungen';
import { loadFixkosten, convertFixkostenToBuchungen } from '@/lib/services/fixkosten';
import { loadLohnkosten, convertLohnkostenToBuchungen } from '@/lib/services/lohnkosten';
import { loadFixkostenOverrides } from '@/lib/services/fixkosten-overrides';
import { Kpis } from '@/app/components/dashboard/Kpis';
import { ForecastChart } from '@/app/components/dashboard/ForecastChart';
import { MonthlyCashflow } from '@/app/components/dashboard/MonthlyCashflow';
import { CostBreakdown } from '@/app/components/dashboard/CostBreakdown';
import { UpcomingPayments } from '@/app/components/dashboard/UpcomingPayments';
import { OverdueInvoices } from '@/app/components/dashboard/OverdueInvoices';
import { TopOutflows } from '@/app/components/dashboard/TopOutflows';
import { SimulationImpact } from '@/app/components/dashboard/SimulationImpact';
import { Alerts } from '@/app/components/dashboard/Alerts';

export default function DashboardPage() {
  const auth = useAuth();
  const [timeRange, setTimeRange] = useState(3);
  const [includeSimulations, setIncludeSimulations] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [enhanced, setEnhanced] = useState<EnhancedTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const today = startOfDay(new Date());
        const s = subMonths(today, 1);
        const e = addMonths(today, timeRange);
        const balance = await getCurrentBalance();
        setCurrentBalance(balance.balance);
        if (!auth.authState.user?.id) return;
        // Use the exact same data pipeline as Planung
        const [buchungen, fixkosten, lohnkostenData, overrides] = await Promise.all([
          loadBuchungen(auth.authState.user.id),
          loadFixkosten(auth.authState.user.id),
          loadLohnkosten(auth.authState.user.id),
          loadFixkostenOverrides(auth.authState.user.id)
        ]);

        const fixBuchungen = convertFixkostenToBuchungen(s, e, fixkosten, overrides);
        const lohnBuchungen = convertLohnkostenToBuchungen(s, e, lohnkostenData.map(l => l.mitarbeiter));
        const all = [...buchungen, ...fixBuchungen, ...lohnBuchungen];
        const sorted = all.sort((a, b) => a.date.getTime() - b.date.getTime());
        const base = includeSimulations ? sorted : sorted.filter(t => t.kategorie !== 'Simulation');
        // Use the same enhancement as Planung for identical Verlaufslinie
        const calc = await enhanceTransactions(base, undefined, balance.balance);
        setEnhanced(calc);
      } catch (e) {
        console.error('Dashboard load error', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [timeRange, includeSimulations, auth.authState.user?.id]);

  function signed(amount: number, direction: 'Incoming' | 'Outgoing') { return direction === 'Incoming' ? amount : -amount; }

  const kpi = useMemo(() => {
    const today = startOfDay(new Date());
    const horizon = new Date(today.getTime() + 30 * 24 * 3600 * 1000);
    const next30 = enhanced.filter(t => t.date >= today && t.date <= horizon);
    const net30 = next30.reduce((s, t) => s + signed(t.amount, t.direction), 0);
    const last3Start = subMonths(startOfMonth(today), 3);
    const last3 = enhanced.filter(t => t.date >= last3Start && t.date < startOfMonth(today));
    const byMonth = new Map<string, number>();
    last3.forEach(t => { const key = `${t.date.getFullYear()}-${t.date.getMonth() + 1}`; byMonth.set(key, (byMonth.get(key) || 0) + signed(t.amount, t.direction)); });
    const months = Array.from(byMonth.values());
    const burn = Math.max(0, -months.reduce((a, b) => a + Math.min(0, b), 0) / Math.max(1, months.length));
    const runwayMonths = burn > 0 ? currentBalance / burn : Infinity;
    const eom = endOfMonth(today);
    const eomForecast = enhanced.filter(t => t.date >= today && t.date <= eom).reduce((s, t) => s + signed(t.amount, t.direction), currentBalance);
    const firstNegative = enhanced.filter(t => t.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime()).find(t => (t.kontostand ?? 0) < 0)?.date || null;
    const openIncoming = enhanced.filter(t => (t as any).is_invoice && t.direction === 'Incoming');
    const openOutgoing = enhanced.filter(t => (t as any).is_invoice && t.direction === 'Outgoing');
    return {
      net30,
      runwayMonths,
      eomForecast,
      firstNegative,
      openIncomingCount: openIncoming.length,
      openIncomingSum: openIncoming.reduce((s, t) => s + t.amount, 0),
      openOutgoingCount: openOutgoing.length,
      openOutgoingSum: openOutgoing.reduce((s, t) => s + t.amount, 0),
    };
  }, [enhanced, currentBalance]);

  const forecastPoints = useMemo(() => {
    // Robust daily projection: cumulative day sums from today's balance
    const today = startOfDay(new Date());
    const keyOf = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    // Sum of signed amounts per day for dates >= today
    const daySum = new Map<string, number>();
    for (const t of enhanced) {
      if (t.date < today) continue;
      const k = keyOf(t.date);
      const s = t.direction === 'Incoming' ? t.amount : -t.amount;
      daySum.set(k, (daySum.get(k) || 0) + s);
    }
    if (typeof window !== 'undefined') {
      const kA = '2025-09-11';
      const kB = '2025-09-12';
      // Debug specific dates if present
      const dbg = [kA, kB].filter(k => daySum.has(k)).map(k => ({ day: k, net: daySum.get(k) }));
      if (dbg.length) {
        // eslint-disable-next-line no-console
        console.log('[Dashboard] Day sums debug:', dbg);
      }
    }
    // Build ordered list of days
    const days = Array.from(daySum.keys()).sort();
    // Start from currentBalance and accumulate per day
    let bal = currentBalance;
    const points: { date: string; balance: number }[] = [];
    for (const d of days) {
      bal += daySum.get(d) || 0;
      points.push({ date: d, balance: bal });
    }
    return points;
  }, [enhanced, currentBalance]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    enhanced.forEach(t => { const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`; map.set(key, (map.get(key) || 0) + signed(t.amount, t.direction)); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([m, v]) => ({ month: m, value: v }));
  }, [enhanced]);

  const today = startOfDay(new Date());
  const lmStart = startOfMonth(subMonths(today, 1));
  const lmEnd = endOfMonth(subMonths(today, 1));
  const breakdown = useMemo(() => {
    const lastMonthOutgoing = enhanced.filter(t => t.date >= lmStart && t.date <= lmEnd && t.direction === 'Outgoing');
    const map = new Map<string, number>();
    lastMonthOutgoing.forEach(t => { const cat = t.kategorie || 'Standard'; map.set(cat, (map.get(cat) || 0) + t.amount); });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [enhanced]);

  const upcoming = useMemo(() => {
    const in14 = new Date(today.getTime() + 14 * 24 * 3600 * 1000);
    return enhanced.filter(t => t.direction === 'Outgoing' && t.date >= today && t.date <= in14).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10);
  }, [enhanced]);

  const overdue = useMemo(() => enhanced.filter(t => (t as any).is_invoice && t.date < today).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10), [enhanced]);
  const topOutflows = useMemo(() => { const in30 = new Date(today.getTime() + 30 * 24 * 3600 * 1000); return enhanced.filter(t => t.direction === 'Outgoing' && t.date >= today && t.date <= in30).sort((a, b) => b.amount - a.amount).slice(0, 5); }, [enhanced]);
  const simulationImpact = useMemo(() => { const eom = endOfMonth(today); const sims = enhanced.filter(t => t.kategorie === 'Simulation' && t.date >= today && t.date <= eom); const delta = sims.reduce((s, t) => s + signed(t.amount, t.direction), 0); return { delta, items: sims.slice(0, 10) }; }, [enhanced]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Zeitraum</label>
          <select value={timeRange} onChange={e => setTimeRange(Number(e.target.value))} className="border border-gray-300 rounded-md px-3 py-2">
            <option value={1}>1 Monat</option>
            <option value={3}>3 Monate</option>
            <option value={6}>6 Monate</option>
            <option value={12}>12 Monate</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={includeSimulations} onChange={e => setIncludeSimulations(e.target.checked)} />
            Simulationen einbeziehen
          </label>
        </div>
      </div>
      
      <Alerts currentBalance={currentBalance} runwayMonths={kpi.runwayMonths} firstNegativeDate={kpi.firstNegative} />

      <Kpis
        currentBalance={currentBalance}
        net30={kpi.net30}
        runwayMonths={kpi.runwayMonths}
        eomForecast={kpi.eomForecast}
        openIncoming={{ count: kpi.openIncomingCount, sum: kpi.openIncomingSum }}
        openOutgoing={{ count: kpi.openOutgoingCount, sum: kpi.openOutgoingSum }}
      />

      <ForecastChart isLoading={isLoading} points={forecastPoints} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyCashflow data={monthlyData} />
        <CostBreakdown data={breakdown} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingPayments items={upcoming} />
        <OverdueInvoices items={overdue} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopOutflows items={topOutflows} />
        <SimulationImpact delta={simulationImpact.delta} items={simulationImpact.items} />
      </div>
    </div>
  );
} 