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
    <Card className="p-6 bg-gradient-to-br from-white to-gray-50 shadow-lg border border-gray-200">
      <Title className="text-2xl font-bold text-gray-800">Monatlicher Cashflow</Title>
      <Subtitle className="text-gray-600 mt-1">
        Einnahmen vs. Ausgaben über die Zeit
      </Subtitle>
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
    </Card>
  );
}
