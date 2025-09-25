'use client';

import { AreaChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

interface ChartInsight {
  type: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  icon: string;
  date?: string;
  value?: number;
}

export function SmartForecastChart({ isLoading, points }: Props) {
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

  // Analyze the data to generate meaningful insights
  const analyzeData = () => {
    const insights: ChartInsight[] = [];
    const currentBalance = points[0]?.balance || 0;
    const finalBalance = points[points.length - 1]?.balance || 0;
    
    // Find critical moments
    const lowestPoint = points.reduce((min, p) => p.balance < min.balance ? p : min);
    const highestPoint = points.reduce((max, p) => p.balance > max.balance ? p : max);
    
    // Find when balance goes negative
    const negativePoint = points.find(p => p.balance < 0);
    const recoveryPoint = points.findIndex((p, i) => i > 0 && points[i-1].balance < 0 && p.balance >= 0);
    
    // Calculate trends
    const midPoint = Math.floor(points.length / 2);
    const firstHalfAvg = points.slice(0, midPoint).reduce((sum, p) => sum + p.balance, 0) / midPoint;
    const secondHalfAvg = points.slice(midPoint).reduce((sum, p) => sum + p.balance, 0) / (points.length - midPoint);
    
    // Critical: Negative balance
    if (negativePoint) {
      const negativeDate = new Date(negativePoint.date).toLocaleDateString('de-CH', { 
        day: 'numeric', 
        month: 'short' 
      });
      insights.push({
        type: 'critical',
        title: 'Kontounterdeckung erwartet',
        description: `Am ${negativeDate} wird ein negativer Saldo von ${formatCHF(negativePoint.balance)} erreicht`,
        icon: '🚨',
        date: negativeDate,
        value: negativePoint.balance
      });
    }
    
    // Warning: Low balance approaching
    const warningThreshold = Math.max(10000, currentBalance * 0.2);
    const lowPoint = points.find(p => p.balance > 0 && p.balance < warningThreshold);
    if (lowPoint && !negativePoint) {
      const lowDate = new Date(lowPoint.date).toLocaleDateString('de-CH', { 
        day: 'numeric', 
        month: 'short' 
      });
      insights.push({
        type: 'warning',
        title: 'Niedriger Kontostand',
        description: `Am ${lowDate} sinkt der Saldo auf ${formatCHF(lowPoint.balance)}`,
        icon: '⚠️',
        date: lowDate,
        value: lowPoint.balance
      });
    }
    
    // Positive: Recovery or growth
    if (finalBalance > currentBalance) {
      const growth = finalBalance - currentBalance;
      insights.push({
        type: 'positive',
        title: 'Positive Entwicklung',
        description: `Kontowachstum von ${formatCHF(growth)} bis Periodenende`,
        icon: '📈',
        value: growth
      });
    } else if (recoveryPoint > -1) {
      const recoveryDate = new Date(points[recoveryPoint].date).toLocaleDateString('de-CH', { 
        day: 'numeric', 
        month: 'short' 
      });
      insights.push({
        type: 'positive',
        title: 'Erholung erwartet',
        description: `Ab ${recoveryDate} wird wieder ein positiver Saldo erreicht`,
        icon: '🔄',
        date: recoveryDate
      });
    }
    
    // Info: Volatility
    const volatility = highestPoint.balance - lowestPoint.balance;
    if (volatility > currentBalance * 0.5) {
      insights.push({
        type: 'info',
        title: 'Hohe Schwankungen',
        description: `Bandbreite von ${formatCHF(volatility)} zwischen Höchst- und Tiefstwert`,
        icon: '📊',
        value: volatility
      });
    }
    
    return insights;
  };

  const insights = analyzeData();
  
  // Enhanced chart data with meaningful zones
  const chartData = points.map((p, index) => {
    const balance = p.balance;
    const date = new Date(p.date);
    const shortDate = date.toLocaleDateString('de-CH', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      date: shortDate,
      'Kontostand': balance,
      'Warnschwelle': balance > 0 ? Math.max(10000, points[0].balance * 0.2) : 0,
      'Kritische Schwelle': 0,
      // Zone classification for coloring
      zone: balance < 0 ? 'critical' : 
            balance < Math.max(10000, points[0].balance * 0.2) ? 'warning' : 'safe'
    };
  });

  const valueFormatter = (number: number) => formatCHF(number);
  
  // Current situation assessment
  const currentBalance = points[0]?.balance || 0;
  const finalBalance = points[points.length - 1]?.balance || 0;
  const trend = finalBalance >= currentBalance;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Smart Header with Real Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Kontostand-Prognose</h2>
            <p className="text-gray-600">
              Intelligente Analyse Ihrer Liquiditätsentwicklung
            </p>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-lg px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Aktuell</p>
              <p className="text-lg font-bold text-gray-900">{formatCHF(currentBalance)}</p>
            </div>
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-lg px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Prognose</p>
              <p className={`text-lg font-bold ${finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCHF(finalBalance)}
              </p>
            </div>
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-lg px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Trend</p>
              <p className={`text-lg font-bold ${trend ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend ? '+' : ''}{formatCHF(finalBalance - currentBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="p-6 bg-gray-50 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Wichtige Erkenntnisse</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'critical' ? 'bg-red-50 border-red-500' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  insight.type === 'positive' ? 'bg-emerald-50 border-emerald-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{insight.icon}</span>
                  <div>
                    <h4 className={`font-semibold ${
                      insight.type === 'critical' ? 'text-red-800' :
                      insight.type === 'warning' ? 'text-yellow-800' :
                      insight.type === 'positive' ? 'text-emerald-800' :
                      'text-blue-800'
                    }`}>
                      {insight.title}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      insight.type === 'critical' ? 'text-red-700' :
                      insight.type === 'warning' ? 'text-yellow-700' :
                      insight.type === 'positive' ? 'text-emerald-700' :
                      'text-blue-700'
                    }`}>
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Enhanced Chart */}
      <div className="p-6">
        <div className="relative">
          <AreaChart
            data={chartData}
            index="date"
            categories={['Kontostand', 'Warnschwelle', 'Kritische Schwelle']}
            colors={['emerald', 'yellow', 'red']}
            valueFormatter={valueFormatter}
            yAxisWidth={100}
            showLegend={true}
            showGridLines={true}
            className="h-80"
            customTooltip={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const balance = payload.find(p => p.dataKey === 'Kontostand')?.value as number;
                const warning = payload.find(p => p.dataKey === 'Warnschwelle')?.value as number;
                
                return (
                  <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 min-w-[200px]" style={{ zIndex: 99999 }}>
                    <div className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                      {label}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Kontostand</span>
                        <span className={`font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCHF(balance)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Warnschwelle</span>
                        <span className="font-medium text-yellow-600">
                          {formatCHF(warning)}
                        </span>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <div className={`flex items-center gap-2 text-sm ${
                          balance < 0 ? 'text-red-600' :
                          balance < warning ? 'text-yellow-600' :
                          'text-emerald-600'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            balance < 0 ? 'bg-red-500' :
                            balance < warning ? 'bg-yellow-500' :
                            'bg-emerald-500'
                          }`}></div>
                          <span className="font-medium">
                            {balance < 0 ? 'Kritisch' :
                             balance < warning ? 'Achtung' :
                             'Sicher'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
        </div>
      </div>
    </div>
  );
}
