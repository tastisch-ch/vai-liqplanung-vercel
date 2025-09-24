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
    <Card className="p-6 bg-gradient-to-br from-white to-gray-50 shadow-lg border border-gray-200">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <Title className="text-2xl font-bold text-gray-800">Kontostand-Prognose</Title>
          <Subtitle className="text-gray-600 mt-1">
            Basierend auf geplantem Zahlungsplan und aktuellem Kontostand
          </Subtitle>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge 
            color={trend ? "emerald" : "red"}
            className="text-sm"
          >
            {trend ? "📈 Aufwärtstrend" : "📉 Abwärtstrend"}
          </Badge>
          {hasNegative && (
            <Badge color="red" className="text-sm">
              ⚠️ Warnung: Negativer Saldo
            </Badge>
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
    </Card>
  );
}
