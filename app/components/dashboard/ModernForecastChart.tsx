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
            colors={['emerald', 'red']}
            valueFormatter={valueFormatter}
            yAxisWidth={100}
            showLegend={true}
            showGridLines={true}
            showXAxis={true}
            showYAxis={true}
            startEndOnly={false}
            className="h-80"
            customTooltip={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const kontostand = payload.find(p => p.dataKey === 'Kontostand')?.value as number;
                const schwelle = payload.find(p => p.dataKey === 'Kritische Schwelle')?.value as number;
                
                return (
                  <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 backdrop-blur-sm" style={{ zIndex: 9999 }}>
                    <div className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                      {label}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">Kontostand</span>
                        </div>
                        <span className={`font-bold text-sm ${kontostand >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCHF(kontostand)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">Kritische Schwelle</span>
                        </div>
                        <span className="font-bold text-sm text-red-600">
                          {formatCHF(schwelle)}
                        </span>
                      </div>
                      {kontostand < 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-red-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-medium">Kontostand im Minus</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
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
