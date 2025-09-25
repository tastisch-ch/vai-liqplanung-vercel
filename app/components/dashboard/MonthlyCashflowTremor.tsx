'use client';

import { BarChart, Card, Title, Subtitle } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Props { 
  data: { month: string; value: number }[] 
}

export function MonthlyCashflowTremor({ data }: Props) {
  // Transform data for Tremor format
  const chartData = data.map(d => ({
    month: d.month,
    'Cashflow': d.value,
  }));

  // Custom value formatter for Swiss Francs
  const valueFormatter = (number: number) => formatCHF(number);

  // Determine colors based on positive/negative values
  const getBarColor = (value: number) => value >= 0 ? 'emerald' : 'red';

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Monatlicher Cashflow</h2>
      <p className="text-gray-600 mb-8">
        Einnahmen vs. Ausgaben über die Zeit
      </p>
      <div className="relative overflow-visible">
        <BarChart
          className="mt-6"
          data={chartData}
          index="month"
          categories={['Cashflow']}
          colors={['blue']}
          valueFormatter={valueFormatter}
          yAxisWidth={80}
          showLegend={false}
          showGridLines={true}
        />
      </div>
    </div>
  );
}
