import PageHeader from "@/components/layout/PageHeader";
'use client';

import { useState, useEffect, useMemo } from 'react';
import { addMonths, addDays, endOfMonth, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import { getCurrentBalance } from '@/lib/services/daily-balance';
import { enhanceTransactions } from '@/lib/services/buchungen';
import { EnhancedTransaction } from '@/models/types';
import { loadBuchungen } from '@/lib/services/buchungen';
import { loadFixkosten, convertFixkostenToBuchungen } from '@/lib/services/fixkosten';
import { loadLohnkosten, convertLohnkostenToBuchungen } from '@/lib/services/lohnkosten';
import { loadFixkostenOverrides } from '@/lib/services/fixkosten-overrides';
import { ModernKpiCards } from '@/app/components/dashboard/ModernKpiCards';
import { SimpleBalanceChart } from '@/app/components/dashboard/SimpleBalanceChart';
// Removed charts after balance chart for now
// Lists removed for now
// Alerts banner removed – integrated into Reichweite KPI
import { OverdueIncomingInvoices } from '@/app/components/dashboard/OverdueIncomingInvoices';
import { CostStructureDonut } from '@/app/components/dashboard/CostStructureDonut';
import { UpcomingLargeOutflows } from '@/app/components/dashboard/UpcomingLargeOutflows';
import { SimulationEffectsCard } from '@/app/components/dashboard/SimulationEffectsCard';

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
    const eom = endOfMonth(today);
    const eomForecast = enhanced.filter(t => t.date >= today && t.date <= eom).reduce((s, t) => s + signed(t.amount, t.direction), currentBalance);
    // Forecast-based runway: days until first negative balance from enhanced (cumulative kontostand)
    const firstNegative = enhanced
      .filter(t => t.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .find(t => (t.kontostand ?? 0) < 0)?.date || null;
    const runwayMonths = firstNegative
      ? Math.max(0, (firstNegative.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) / 30
      : Infinity;
    const openIncoming = enhanced.filter(t => (t as any).is_invoice && t.direction === 'Incoming');
    // Outgoing summary should include all future Outgoing (incl. Fixkosten), regardless of is_invoice
    const openOutgoing = enhanced.filter(t => t.direction === 'Outgoing' && t.date >= today && t.date <= horizon);
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
    // Robust daily projection: cumulative day sums starting from tomorrow
    const today = startOfDay(new Date());
    const start = addDays(today, 1); // first point is always tomorrow
    const end = addMonths(today, timeRange);
    const keyOf = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    // Sum of signed amounts per day for dates >= today
    const daySum = new Map<string, number>();
    for (const t of enhanced) {
      if (t.date < start) continue; // ignore transactions dated today
      const k = keyOf(t.date);
      const s = t.direction === 'Incoming' ? t.amount : -t.amount;
      daySum.set(k, (daySum.get(k) || 0) + s);
    }
    // Build contiguous list of days from today -> end
    let bal = currentBalance;
    const points: { date: string; balance: number }[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const k = keyOf(d);
      bal += daySum.get(k) || 0;
      points.push({ date: k, balance: bal });
    }
    return points;
  }, [enhanced, currentBalance, timeRange]);

  // monthlyData removed with charts

  const today = startOfDay(new Date());
  const overdueIncoming = useMemo(
    () => enhanced.filter(t => t.direction === 'Incoming' && (t as any).shifted === true),
    [enhanced]
  );
  const lmStart = startOfMonth(subMonths(today, 1));
  const lmEnd = endOfMonth(subMonths(today, 1));
  const costStructure = useMemo(() => {
    const lastMonthOutgoing = enhanced.filter(t => t.date >= lmStart && t.date <= lmEnd && t.direction === 'Outgoing');
    const map = new Map<string, number>();
    lastMonthOutgoing.forEach(t => { const cat = t.kategorie || 'Sonstiges'; map.set(cat, (map.get(cat) || 0) + t.amount); });
    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
  }, [enhanced]);

  const largeOutflows = useMemo(() => {
    const today2 = startOfDay(new Date());
    const in60 = new Date(today2.getTime() + 60 * 24 * 3600 * 1000);
    return enhanced.filter(t => t.direction === 'Outgoing' && t.date >= today2 && t.date <= in60 && t.amount >= 5000).sort((a,b)=> a.date.getTime() - b.date.getTime());
  }, [enhanced]);

  const effects = useMemo(() => {
    const eom = endOfMonth(today);
    const sims = enhanced.filter(t => t.kategorie === 'Simulation' && t.date >= today && t.date <= eom);
    const delta = sims.reduce((s,t)=> s + (t.direction === 'Incoming' ? t.amount : -t.amount), 0);
    return { sims, delta };
  }, [enhanced]);

  // Lists data removed for now

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Dashboard" subtitle="Aktuelle Kennzahlen und Forecast" actions={
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
      } />
      
      {/* Banner removed: undercoverage info now lives in Reichweite KPI */}

      <ModernKpiCards
        currentBalance={currentBalance}
        net30={kpi.net30}
        runwayMonths={kpi.runwayMonths}
        eomForecast={kpi.eomForecast}
        openIncoming={{ count: kpi.openIncomingCount, sum: kpi.openIncomingSum }}
        openOutgoing={{ count: kpi.openOutgoingCount, sum: kpi.openOutgoingSum }}
        firstNegative={kpi.firstNegative}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <SimpleBalanceChart isLoading={isLoading} points={forecastPoints} />
        </div>
      </div>

      {/* Charts after balance chart temporarily removed */}
      
      {/* Overdue incoming invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverdueIncomingInvoices items={overdueIncoming} />
        <CostStructureDonut data={costStructure} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingLargeOutflows items={largeOutflows} />
        <SimulationEffectsCard items={effects.sims} delta={effects.delta} />
      </div>
    </div>
  );
} 