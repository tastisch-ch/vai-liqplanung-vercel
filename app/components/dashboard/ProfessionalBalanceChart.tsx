'use client';

import { useState } from 'react';
import { LineChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

export function ProfessionalBalanceChart({ isLoading, points }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState('Max.');
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="animate-pulse space-y-6">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-48"></div>
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-5 bg-gray-200 rounded w-80"></div>
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center py-16">
          <div className="text-gray-400 text-5xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900">Keine Prognosedaten</h3>
          <p className="text-gray-500 mt-1">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const currentBalance = points[0]?.balance || 0;
  const finalBalance = points[points.length - 1]?.balance || 0;
  const changeAmount = finalBalance - currentBalance;
  const changePercent = currentBalance !== 0 ? (changeAmount / currentBalance) * 100 : 0;
  const isPositive = changeAmount >= 0;

  // Transform data
  const chartData = points.map(p => {
    const date = new Date(p.date);
    return {
      date: date.toLocaleDateString('de-CH', { month: 'short', day: 'numeric' }),
      'Kontostand': p.balance,
      'Kritische Schwelle': 0
    };
  });

  const periods = [
    { key: 'Last 7d', label: 'Letzte 7 Tage' },
    { key: 'Last 30d', label: 'Letzte 30 Tage' },
    { key: 'Max.', label: 'Gesamt' }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="px-8 py-6 border-b border-gray-100">
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-600 mb-1">Kontostand-Prognose</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-bold text-gray-900">
              {formatCHF(currentBalance)}
            </h2>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
              isPositive 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              <span>{isPositive ? '↗' : '↘'}</span>
              <span>{isPositive ? '+' : ''}{formatCHF(changeAmount)}</span>
              <span>({isPositive ? '+' : ''}{changePercent.toFixed(1)}%)</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Prognose für Periodenende
          </p>
        </div>

        {/* Period Tabs */}
        <div className="flex bg-gray-50 rounded-lg p-1">
          {periods.map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedPeriod === period.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      <div className="px-8 py-6">
        <LineChart
          data={chartData}
          index="date"
          categories={['Kontostand', 'Kritische Schwelle']}
          colors={['blue', 'red']}
          valueFormatter={(value) => formatCHF(value)}
          showLegend={true}
          showYAxis={true}
          showGridLines={true}
          yAxisWidth={80}
          className="h-80"
        />
      </div>

      {/* Summary Section */}
      <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prognose-Zusammenfassung</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Aktueller Stand</p>
            <p className="text-xl font-bold text-gray-900">{formatCHF(currentBalance)}</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Prognose Periodenende</p>
            <p className={`text-xl font-bold ${
              finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {formatCHF(finalBalance)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Erwartete Veränderung</p>
            <p className={`text-xl font-bold ${
              isPositive ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {isPositive ? '+' : ''}{formatCHF(changeAmount)}
            </p>
          </div>
        </div>

        {/* Risk Indicator */}
        {finalBalance < 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">
                  Liquiditätswarnung
                </h4>
                <p className="text-sm text-red-700">
                  Die Prognose zeigt einen negativen Kontostand. Überprüfen Sie Ihre Zahlungspläne und erwägen Sie Maßnahmen zur Liquiditätssicherung.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
