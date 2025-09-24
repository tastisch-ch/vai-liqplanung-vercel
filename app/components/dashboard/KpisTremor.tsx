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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Current Balance */}
      <Card className="p-6 bg-gradient-to-br from-white to-gray-50 border-l-4 border-l-emerald-500 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <Text className="text-gray-600 font-medium">Aktueller Kontostand</Text>
            <Metric className={`mt-2 text-3xl font-bold ${
              balanceHealth === 'emerald' ? 'text-emerald-600' : 
              balanceHealth === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatCHF(currentBalance)}
            </Metric>
          </div>
          <Badge 
            color={balanceHealth}
            className="text-xs"
          >
            {balanceHealth === 'emerald' ? '💚 Gesund' : 
             balanceHealth === 'yellow' ? '⚠️ Achtung' : '🚨 Kritisch'}
          </Badge>
        </div>
        <Text className="mt-4 text-sm text-gray-500">
          Stand: {new Date().toLocaleDateString('de-CH')}
        </Text>
      </Card>

      {/* 30-Day Net */}
      <Card className="p-6 bg-gradient-to-br from-white to-gray-50 border-l-4 border-l-blue-500 shadow-lg">
        <Text className="text-gray-600 font-medium">Netto 30 Tage</Text>
        <Metric className={`mt-2 text-3xl font-bold ${net30 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCHF(net30)}
        </Metric>
        <div className="mt-4 flex gap-4">
          <div className="text-sm">
            <span className="text-emerald-600">📈 Eingehend:</span>
            <div className="font-semibold">{formatCHF(openIncoming.sum)}</div>
          </div>
          <div className="text-sm">
            <span className="text-red-600">📉 Ausgehend:</span>
            <div className="font-semibold">{formatCHF(openOutgoing.sum)}</div>
          </div>
        </div>
        <div className="mt-4">
          <Badge color={net30 >= 0 ? "emerald" : "red"} size="xs">
            {openIncoming.count + openOutgoing.count} geplante Transaktionen
          </Badge>
        </div>
      </Card>

      {/* Financial Runway */}
      <Card className="p-6 bg-gradient-to-br from-white to-gray-50 border-l-4 border-l-purple-500 shadow-lg">
        <div className="w-full">
          <Text className="text-gray-600 font-medium">Finanzielle Reichweite</Text>
          <Metric className={`mt-2 text-3xl font-bold ${
            runwayHealth === 'emerald' ? 'text-emerald-600' : 
            runwayHealth === 'yellow' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {runwayMonths.toFixed(1)} Monate
          </Metric>
          <ProgressBar 
            value={runwayProgress} 
            color={runwayHealth}
            className="mt-4"
          />
        </div>
        <Text className="mt-4 text-sm text-gray-500">
          Bei aktuellem Ausgabeniveau
        </Text>
      </Card>

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
