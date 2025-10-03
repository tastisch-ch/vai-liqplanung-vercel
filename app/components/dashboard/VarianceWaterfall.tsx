"use client";

import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatCHF } from '@/lib/currency';

type RevenueProgress = {
  year: number;
  target: number; // Budget
  achieved: number; // Importiert (IST realisiert)
  open_invoices_sum?: number; // Geplant (offene Rechnungen)
  remaining: number;
};

export default function VarianceWaterfall() {
  const [data, setData] = useState<RevenueProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const y = new Date().getFullYear();
    fetch(`/api/revenue/progress?year=${y}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [] as any[];
    const budget = data.target;
    const imported = data.achieved;
    const planned = data.open_invoices_sum || 0;
    const forecast = imported + planned; // simple: IST + offene
    const gap = budget - forecast; // positive => Lücke

    return [
      { name: 'Budget', value: budget, type: 'total' },
      { name: 'Geplant', value: planned, type: 'delta-positive' },
      { name: 'Importiert', value: imported, type: 'delta-positive' },
      { name: 'Forecast', value: forecast, type: 'total' },
      { name: 'Lücke', value: gap, type: gap >= 0 ? 'delta-negative' : 'delta-positive' },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="relative bg-white dark:bg-neutral-950 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-white/10 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-56 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="relative bg-white dark:bg-neutral-950 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-white/10">
        <div className="text-sm text-gray-600">Varianz-Wasserfall</div>
        <div className="h-56 flex items-center justify-center text-gray-500">Keine Daten</div>
      </div>
    );
  }

  const axisFormatter = (n: number) => new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="relative bg-white dark:bg-neutral-950 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-white/10 transition-shadow duration-300 hover:border-emerald-200">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Varianz-Wasserfall</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={axisFormatter as any} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: any) => formatCHF(Number(v))} />
            <Bar dataKey="value" radius={[6,6,0,0]}>
              {
                chartData.map((entry, index) => {
                  const color = entry.type === 'total' ? '#2563eb' : (entry.type === 'delta-positive' ? '#10b981' : '#ef4444');
                  return (
                    <rect key={`bar-${index}`} x={0} y={0} width={0} height={0} fill={color} />
                  );
                })
              }
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


