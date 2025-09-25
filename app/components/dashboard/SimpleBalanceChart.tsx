'use client';

import { formatCHF } from '@/lib/currency';
import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

const valueFormatter = (number: number) => formatCHF(number);
const axisFormatter = (n: number) =>
  new Intl.NumberFormat('de-CH', {
    maximumFractionDigits: 0,
  }).format(n);

export function SimpleBalanceChart({ isLoading, points }: Props) {

  if (isLoading) {
    return (
      <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-shadow duration-300 hover:border-emerald-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-shadow duration-300 hover:border-emerald-200">
        <h3 className="mb-2 text-sm text-gray-600">Kontostand-Prognose</h3>
        <p className="text-2xl font-semibold text-gray-900">Keine Daten</p>
      </div>
    );
  }

  // Transform data for LineChart
  const chartData = points.map(p => {
    const d = new Date(p.date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const label = `${dd}.${mm}`;
    return { date: label, 'Kontostand': p.balance };
  });

  // Get current balance
  const currentBalance = points[0]?.balance || 0;
  // Domain calc with 10% padding and include 0
  const values = points.map(p => p.balance);
  const minV = Math.min(...values, 0);
  const maxV = Math.max(...values, 0);
  const pad = Math.max(1, Math.round((maxV - minV) * 0.1));
  const domainMin = minV - pad;
  const domainMax = maxV + pad;

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-shadow duration-300 hover:border-emerald-200 overflow-hidden">
      <h3 className="mb-2 text-sm text-gray-600">Kontostand-Prognose</h3>
      <p className="text-2xl font-semibold text-gray-900">{formatCHF(currentBalance)}</p>
      <div className="mt-6 hidden h-64 sm:block">
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" interval="preserveStartEnd" tick={{ fontSize: 12 }} />
            <YAxis
              width={64}
              tickFormatter={axisFormatter as any}
              tick={{ fontSize: 12 }}
              domain={[domainMin, domainMax]}
              scale="linear"
              allowDecimals={false}
              tickCount={5}
            />
            <RTooltip content={<CustomTooltip data={chartData} />} />
            <Line type="monotone" dataKey="Kontostand" stroke="#2563eb" strokeWidth={2.25} dot={false} isAnimationActive={false} />
          </RLineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 h-56 sm:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" interval="preserveStartEnd" tick={{ fontSize: 12 }} />
            <RTooltip content={<CustomTooltip data={chartData} />} />
            <Line type="monotone" dataKey="Kontostand" stroke="#2563eb" strokeWidth={2.25} dot={false} isAnimationActive={false} />
          </RLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, data }: any) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value as number;
  // find previous point for delta
  const idx = data.findIndex((d: any) => d.date === label);
  const prev = idx > 0 ? (data[idx - 1].Kontostand as number) : undefined;
  const delta = prev !== undefined ? value - prev : undefined;
  const deltaColor = delta !== undefined ? (delta >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-500';
  const [dd, mm] = label.split('.');
  const displayDate = `${dd}.${mm}.`;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-xs text-gray-500 mb-1">{displayDate}</div>
      <div className="text-sm font-semibold text-gray-900">{formatCHF(value)}</div>
      {delta !== undefined && (
        <div className={`text-xs mt-0.5 ${deltaColor}`}>
          {delta >= 0 ? '+' : ''}{formatCHF(delta)} vs. Vortag
        </div>
      )}
    </div>
  );
}
