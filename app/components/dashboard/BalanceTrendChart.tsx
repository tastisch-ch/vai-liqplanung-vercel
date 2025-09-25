'use client';

import { Card, LineChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

const valueFormatter = (number: number) => formatCHF(number);

export function BalanceTrendChart({ isLoading, points }: Props) {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
        <div className="h-72 bg-gray-200 rounded"></div>
      </Card>
    );
  }

  if (!points || points.length === 0) {
    return (
      <Card>
        <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
          Kontostand-Prognose
        </h3>
        <p className="mt-1 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
          Keine Prognosedaten verfügbar
        </p>
      </Card>
    );
  }

  // Transform data for Tremor LineChart
  const chartData = points.map(p => {
    const date = new Date(p.date);
    const formattedDate = date.toLocaleDateString('de-CH', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      date: formattedDate,
      'Kontostand': p.balance,
      'Kritische Schwelle': 0
    };
  });

  return (
    <Card>
      <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
        Kontostand-Prognose
      </h3>
      <p className="mt-1 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
        Basierend auf geplantem Zahlungsplan und aktuellem Kontostand
      </p>
      <LineChart
        data={chartData}
        index="date"
        categories={['Kontostand', 'Kritische Schwelle']}
        colors={['blue', 'red']}
        valueFormatter={valueFormatter}
        yAxisWidth={100}
        showLegend={true}
        className="mt-8 h-72"
      />
    </Card>
  );
}
