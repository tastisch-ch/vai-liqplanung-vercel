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
    <Card className="max-w-full">
      <Title>Monatlicher Cashflow</Title>
      <Subtitle>
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
