'use client';

import { LineChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

const valueFormatter = (number: number) => formatCHF(number);

export function SimpleBalanceChart({ isLoading, points }: Props) {

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="mb-2 text-sm text-gray-600">Kontostand-Prognose</h3>
        <p className="text-2xl font-semibold text-gray-900">Keine Daten</p>
      </div>
    );
  }

  // Transform data for AreaChart
  const chartData = points.map(p => {
    const d = new Date(p.date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const label = `${dd}.${mm}`;
    return { date: label, 'Kontostand': p.balance };
  });

  // Get current balance
  const currentBalance = points[0]?.balance || 0;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="mb-2 text-sm text-gray-600">Kontostand-Prognose</h3>
      <p className="text-2xl font-semibold text-gray-900">{formatCHF(currentBalance)}</p>
      
      <LineChart
        data={chartData}
        index="date"
        categories={['Kontostand']}
        colors={['blue']}
        showLegend={false}
        valueFormatter={valueFormatter}
        showYAxis={true}
        yAxisWidth={64}
        showGridLines={true}
        className="mt-6 hidden h-48 sm:block"
      />
      
      <LineChart
        data={chartData}
        index="date"
        categories={['Kontostand']}
        colors={['blue']}
        showLegend={false}
        valueFormatter={valueFormatter}
        startEndOnly={true}
        showYAxis={false}
        className="mt-6 h-48 sm:hidden"
      />
    </div>
  );
}
