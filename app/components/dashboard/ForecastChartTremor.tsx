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
    <Card className="max-w-full">
      <Flex>
        <div>
          <Title>Kontostand-Prognose</Title>
          <Subtitle>
            Basierend auf geplantem Zahlungsplan und aktuellem Kontostand
          </Subtitle>
        </div>
        <div className="flex gap-2">
          <Badge 
            color={trend ? "emerald" : "red"}
          >
            {trend ? "📈 Aufwärtstrend" : "📉 Abwärtstrend"}
          </Badge>
          {hasNegative && (
            <Badge color="red">
              ⚠️ Warnung: Negativer Saldo
            </Badge>
          )}
        </div>
      </Flex>
      
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
