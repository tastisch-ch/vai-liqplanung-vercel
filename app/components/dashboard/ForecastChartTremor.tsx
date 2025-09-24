'use client';

import { AreaChart, Card, Title, Subtitle, Badge, Flex } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

export function ForecastChartTremor({ isLoading, points }: Props) {
  if (isLoading) {
    return (
      <Card className="max-w-full">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!points || points.length === 0) {
    return (
      <Card className="max-w-full">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <Title className="text-gray-500">Keine Prognosedaten verfügbar</Title>
          <Subtitle className="mt-2">
            Bitte aktualisieren Sie den Kontostand in der Seitenleiste
          </Subtitle>
        </div>
      </Card>
    );
  }

  // Transform data for Tremor
  const chartData = points.map(p => ({
    date: p.date,
    'Kontostand': p.balance,
    'Kritische Schwelle': 0, // Show zero line
  }));

  // Determine trend
  const currentBalance = points[0]?.balance || 0;
  const futureBalance = points[points.length - 1]?.balance || 0;
  const trend = futureBalance >= currentBalance;
  const hasNegative = points.some(p => p.balance < 0);

  const valueFormatter = (number: number) => formatCHF(number);

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kontostand-Prognose</h2>
          <p className="text-gray-600 mt-1">
            Basierend auf geplantem Zahlungsplan und aktuellem Kontostand
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            trend ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {trend ? "📈 Aufwärtstrend" : "📉 Abwärtstrend"}
          </span>
          {hasNegative && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              ⚠️ Warnung: Negativer Saldo
            </span>
          )}
        </div>
      </div>
      
      <AreaChart
        className="mt-6"
        data={chartData}
        index="date"
        categories={['Kontostand', 'Kritische Schwelle']}
        colors={['blue', 'red']}
        valueFormatter={valueFormatter}
        yAxisWidth={80}
        showLegend={true}
        showGridLines={true}
      />
    </div>
  );
}
