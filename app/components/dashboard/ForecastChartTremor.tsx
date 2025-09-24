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
            icon={trend ? "📈" : "📉"}
          >
            {trend ? "Aufwärtstrend" : "Abwärtstrend"}
          </Badge>
          {hasNegative && (
            <Badge color="red" icon="⚠️">
              Warnung: Negativer Saldo
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
        animationDuration={1500}
        fillOpacity={0.2}
        strokeWidth={2}
        curveType="monotone"
        customTooltip={({ active, payload, label }) => {
          if (active && payload && payload.length) {
            const balance = payload[0].value as number;
            const isNegative = balance < 0;
            const dayDate = new Date(label);
            const formattedDate = dayDate.toLocaleDateString('de-CH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            return (
              <div className="bg-white p-4 shadow-xl rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900 mb-2">{formattedDate}</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isNegative ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                  <p className={`font-semibold ${isNegative ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatCHF(balance)}
                  </p>
                </div>
                {isNegative && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    ⚠️ Kontostand im Minus
                  </p>
                )}
              </div>
            );
          }
          return null;
        }}
        showTooltip={true}
      />
    </Card>
  );
}
