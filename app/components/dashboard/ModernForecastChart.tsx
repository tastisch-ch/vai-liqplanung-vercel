'use client';

import { Card, Title, Subtitle, AreaChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

export function ModernForecastChart({ isLoading, points }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-80 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Keine Prognosedaten verfügbar</h3>
          <p className="text-gray-600">
            Bitte aktualisieren Sie den Kontostand in der Seitenleiste
          </p>
        </div>
      </div>
    );
  }

  // Transform data for Tremor with enhanced formatting
  const chartData = points.map((p, index) => {
    const date = new Date(p.date);
    const formattedDate = date.toLocaleDateString('de-CH', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      date: formattedDate,
      'Kontostand': p.balance,
      'Kritische Schwelle': 0,
      // Add trend information
      trend: index > 0 ? (p.balance >= points[index - 1].balance ? 'up' : 'down') : 'neutral'
    };
  });

  // Determine overall trend and health
  const currentBalance = points[0]?.balance || 0;
  const futureBalance = points[points.length - 1]?.balance || 0;
  const trend = futureBalance >= currentBalance;
  const hasNegative = points.some(p => p.balance < 0);
  
  // Calculate key metrics
  const minBalance = Math.min(...points.map(p => p.balance));
  const maxBalance = Math.max(...points.map(p => p.balance));
  const balanceRange = maxBalance - minBalance;

  const valueFormatter = (number: number) => formatCHF(number);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-8 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Kontostand-Prognose</h2>
            <p className="text-gray-600 text-lg">
              Basierend auf geplantem Zahlungsplan und aktuellem Kontostand
            </p>
            
            {/* Key Metrics */}
            <div className="flex gap-6 mt-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm text-gray-600">Aktuell</p>
                <p className="text-lg font-bold text-blue-600">{formatCHF(currentBalance)}</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm text-gray-600">Prognose</p>
                <p className={`text-lg font-bold ${futureBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCHF(futureBalance)}
                </p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm text-gray-600">Veränderung</p>
                <p className={`text-lg font-bold ${trend ? 'text-emerald-600' : 'text-red-600'}`}>
                  {trend ? '+' : ''}{formatCHF(futureBalance - currentBalance)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Status Badges */}
          <div className="flex gap-3 flex-wrap">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
              trend ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                     'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {trend ? "📈 Aufwärtstrend" : "📉 Abwärtstrend"}
            </span>
            
            {hasNegative && (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                ⚠️ Warnung: Negativer Saldo erwartet
              </span>
            )}
            
            {balanceRange > 50000 && (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                📊 Hohe Volatilität
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Chart */}
      <div className="p-8">
        <div className="relative overflow-visible">
          <AreaChart
            data={chartData}
            index="date"
            categories={['Kontostand', 'Kritische Schwelle']}
            colors={['blue', 'red']}
            valueFormatter={valueFormatter}
            yAxisWidth={100}
            showLegend={true}
            showGridLines={true}
            showXAxis={true}
            showYAxis={true}
            startEndOnly={false}
            className="h-80"
          />
        </div>
        
        {/* Chart Footer with Insights */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-600">Niedrigster Wert</p>
              <p className={`font-semibold ${minBalance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {formatCHF(minBalance)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Höchster Wert</p>
              <p className="font-semibold text-gray-800">{formatCHF(maxBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Schwankungsbreite</p>
              <p className="font-semibold text-gray-800">{formatCHF(balanceRange)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
