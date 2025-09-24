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
    <Grid numItemsSm={2} numItemsLg={3} className="gap-6">
      {/* Current Balance */}
      <Card className="max-w-full">
        <Flex alignItems="start">
          <div>
            <Text>Aktueller Kontostand</Text>
            <Metric className={`${
              balanceHealth === 'emerald' ? 'text-emerald-600' : 
              balanceHealth === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatCHF(currentBalance)}
            </Metric>
          </div>
          <Badge 
            color={balanceHealth}
          >
            {balanceHealth === 'emerald' ? '💚 Gesund' : 
             balanceHealth === 'yellow' ? '⚠️ Achtung' : '🚨 Kritisch'}
          </Badge>
        </Flex>
        <Text className="mt-2 text-sm text-gray-600">
          Stand: {new Date().toLocaleDateString('de-CH')}
        </Text>
      </Card>

      {/* 30-Day Net */}
      <Card className="max-w-full">
        <Text>Netto 30 Tage</Text>
        <Metric className={net30 >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          {formatCHF(net30)}
        </Metric>
        <Flex className="mt-4" justifyContent="start" spaceX="space-x-2">
          <Text className="text-sm">
            📈 Eingehend: {formatCHF(openIncoming.sum)}
          </Text>
          <Text className="text-sm">
            📉 Ausgehend: {formatCHF(openOutgoing.sum)}
          </Text>
        </Flex>
        <div className="mt-2">
          <Badge color={net30 >= 0 ? "emerald" : "red"} size="xs">
            {openIncoming.count + openOutgoing.count} geplante Transaktionen
          </Badge>
        </div>
      </Card>

      {/* Financial Runway */}
      <Card className="max-w-full">
        <Flex alignItems="start">
          <div className="w-full">
            <Text>Finanzielle Reichweite</Text>
            <Metric className={`${
              runwayHealth === 'emerald' ? 'text-emerald-600' : 
              runwayHealth === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {runwayMonths.toFixed(1)} Monate
            </Metric>
            <ProgressBar 
              value={runwayProgress} 
              color={runwayHealth}
              className="mt-3"
            />
          </div>
        </Flex>
        <Text className="mt-2 text-sm text-gray-600">
          Bei aktuellem Ausgabeniveau
        </Text>
      </Card>

      {/* End of Month Forecast */}
      <Card className="max-w-full">
        <Text>Monatsende-Prognose</Text>
        <Metric className={eomForecast >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          {formatCHF(eomForecast)}
        </Metric>
        <Flex className="mt-4" justifyContent="start">
          <Badge 
            color={eomTrend ? "emerald" : "red"}
          >
            {eomTrend ? '📈 Wachstum' : '📉 Rückgang'} vs. heute
          </Badge>
        </Flex>
        <Text className="mt-2 text-sm text-gray-600">
          Differenz: {formatCHF(eomForecast - currentBalance)}
        </Text>
      </Card>

      {/* Open Transactions Summary */}
      <Card className="max-w-full col-span-2">
        <Text>Offene Transaktionen</Text>
        <div className="mt-4 space-y-3">
          <Flex>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <Text>Eingehende Zahlungen</Text>
            </div>
            <div className="text-right">
              <Metric color="emerald" className="text-emerald-600">
                {formatCHF(openIncoming.sum)}
              </Metric>
              <Text className="text-xs text-gray-500">
                {openIncoming.count} Transaktionen
              </Text>
            </div>
          </Flex>
          
          <Flex>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <Text>Ausgehende Zahlungen</Text>
            </div>
            <div className="text-right">
              <Metric className="text-red-600">
                {formatCHF(openOutgoing.sum)}
              </Metric>
              <Text className="text-xs text-gray-500">
                {openOutgoing.count} Transaktionen
              </Text>
            </div>
          </Flex>
        </div>
      </Card>
    </Grid>
  );
}
