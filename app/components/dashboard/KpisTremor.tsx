'use client';

import { Card, Metric, Text, Flex, Badge, ProgressBar, Grid } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface KpisProps {
  currentBalance: number;
  net30: number;
  runwayMonths: number;
  eomForecast: number;
  openIncoming: { count: number; sum: number };
  openOutgoing: { count: number; sum: number };
}

export function KpisTremor({ 
  currentBalance, 
  net30, 
  runwayMonths, 
  eomForecast, 
  openIncoming, 
  openOutgoing 
}: KpisProps) {
  
  // Calculate health indicators
  const balanceHealth = currentBalance > 10000 ? "emerald" : currentBalance > 0 ? "yellow" : "red";
  const runwayHealth = runwayMonths > 6 ? "emerald" : runwayMonths > 3 ? "yellow" : "red";
  const eomTrend = eomForecast >= currentBalance;
  
  // Calculate runway progress (assuming 12 months is "good")
  const runwayProgress = Math.min((runwayMonths / 12) * 100, 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Current Balance */}
      <div className="group relative overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-blue-50/30"></div>
        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <Badge 
              color={balanceHealth}
              className="px-3 py-1 text-xs font-semibold"
            >
              {balanceHealth === 'emerald' ? '💚 Gesund' : 
               balanceHealth === 'yellow' ? '⚠️ Achtung' : '🚨 Kritisch'}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Aktueller Kontostand</p>
            <p className={`text-4xl font-bold mb-1 ${
              balanceHealth === 'emerald' ? 'text-emerald-600' : 
              balanceHealth === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatCHF(currentBalance)}
            </p>
            <p className="text-xs text-gray-500">
              Stand: {new Date().toLocaleDateString('de-CH')}
            </p>
          </div>
        </div>
      </div>

      {/* 30-Day Net */}
      <div className="group relative overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30"></div>
        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <Badge color={net30 >= 0 ? "emerald" : "red"} className="px-3 py-1 text-xs font-semibold">
              {openIncoming.count + openOutgoing.count} Transaktionen
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Netto 30 Tage</p>
            <p className={`text-4xl font-bold mb-4 ${net30 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCHF(net30)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-3 rounded-lg">
                <p className="text-xs text-emerald-600 font-medium">Eingehend</p>
                <p className="text-lg font-bold text-emerald-700">{formatCHF(openIncoming.sum)}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-xs text-red-600 font-medium">Ausgehend</p>
                <p className="text-lg font-bold text-red-700">{formatCHF(openOutgoing.sum)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Runway */}
      <div className="group relative overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/30"></div>
        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-purple-100 rounded-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <Badge 
              color={runwayHealth}
              className="px-3 py-1 text-xs font-semibold"
            >
              {runwayHealth === 'emerald' ? 'Sicher' : runwayHealth === 'yellow' ? 'Achtung' : 'Kritisch'}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Finanzielle Reichweite</p>
            <p className={`text-4xl font-bold mb-4 ${
              runwayHealth === 'emerald' ? 'text-emerald-600' : 
              runwayHealth === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {runwayMonths.toFixed(1)} Monate
            </p>
            <div className="mb-3">
              <ProgressBar 
                value={runwayProgress} 
                color={runwayHealth}
                className="h-3"
              />
            </div>
            <p className="text-xs text-gray-500">
              Bei aktuellem Ausgabeniveau
            </p>
          </div>
        </div>
      </div>

      {/* End of Month Forecast */}
      <Card className="p-6 bg-gradient-to-br from-white to-gray-50 border-l-4 border-l-indigo-500 shadow-lg">
        <Text className="text-gray-600 font-medium">Monatsende-Prognose</Text>
        <Metric className={`mt-2 text-3xl font-bold ${eomForecast >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCHF(eomForecast)}
        </Metric>
        <div className="mt-4">
          <Badge 
            color={eomTrend ? "emerald" : "red"}
          >
            {eomTrend ? '📈 Wachstum' : '📉 Rückgang'} vs. heute
          </Badge>
        </div>
        <Text className="mt-4 text-sm text-gray-500">
          Differenz: {formatCHF(eomForecast - currentBalance)}
        </Text>
      </Card>

      {/* Open Transactions Summary */}
      <Card className="p-6 bg-gradient-to-br from-white to-gray-50 border-l-4 border-l-orange-500 shadow-lg col-span-full lg:col-span-2">
        <Text className="text-gray-600 font-medium text-lg">Offene Transaktionen</Text>
        <div className="mt-6 space-y-6">
          <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
              <Text className="font-medium">Eingehende Zahlungen</Text>
            </div>
            <div className="text-right">
              <Metric className="text-emerald-600 text-2xl font-bold">
                {formatCHF(openIncoming.sum)}
              </Metric>
              <Text className="text-xs text-gray-500 mt-1">
                {openIncoming.count} Transaktionen
              </Text>
            </div>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <Text className="font-medium">Ausgehende Zahlungen</Text>
            </div>
            <div className="text-right">
              <Metric className="text-red-600 text-2xl font-bold">
                {formatCHF(openOutgoing.sum)}
              </Metric>
              <Text className="text-xs text-gray-500 mt-1">
                {openOutgoing.count} Transaktionen
              </Text>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
