'use client';

import { useState } from 'react';
import { RiArrowRightUpLine, RiCloseLine } from '@remixicon/react';
import { AreaChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

const valueFormatter = (number: number) => formatCHF(number);

export function SimpleBalanceChart({ isLoading, points }: Props) {
  const [isWarningOpen, setIsWarningOpen] = useState(true);
  const [isPositiveOpen, setIsPositiveOpen] = useState(true);

  if (isLoading) {
    return (
      <Card className="sm:mx-auto sm:max-w-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="h-48 bg-gray-200 rounded"></div>
      </Card>
    );
  }

  if (!points || points.length === 0) {
    return (
      <Card className="sm:mx-auto sm:max-w-lg">
        <h3 className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
          Kontostand-Prognose
        </h3>
        <p className="text-2xl font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
          Keine Daten
        </p>
      </Card>
    );
  }

  // Transform data for AreaChart
  const chartData = points.map(p => {
    const date = new Date(p.date);
    const formattedDate = date.toLocaleDateString('de-CH', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      date: formattedDate,
      'Kontostand': p.balance,
    };
  });

  // Get current balance
  const currentBalance = points[0]?.balance || 0;
  const finalBalance = points[points.length - 1]?.balance || 0;
  const isIncreasing = finalBalance > currentBalance;
  const hasNegativeBalance = points.some(p => p.balance < 0);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="mb-2 text-sm text-gray-600">Kontostand-Prognose</h3>
      <p className="text-2xl font-semibold text-gray-900">{formatCHF(currentBalance)}</p>
      
      <AreaChart
        data={chartData}
        index="date"
        categories={['Kontostand']}
        colors={['blue']}
        showLegend={false}
        showGradient={false}
        valueFormatter={valueFormatter}
        showYAxis={false}
        className="mt-6 hidden h-48 sm:block"
      />
      
      <AreaChart
        data={chartData}
        index="date"
        categories={['Kontostand']}
        colors={['blue']}
        showLegend={false}
        showGradient={false}
        valueFormatter={valueFormatter}
        startEndOnly={true}
        showYAxis={false}
        className="mt-6 h-48 sm:hidden"
      />

      {isWarningOpen && hasNegativeBalance ? (
        <div className="relative mt-4 rounded-tremor-small border border-tremor-border bg-tremor-background-muted p-4 dark:border-dark-tremor-border dark:bg-dark-tremor-background-subtle">
          <div className="flex items-center space-x-2.5">
            <RiArrowRightUpLine
              className="size-5 shrink-0 text-red-600 dark:text-red-500"
              aria-hidden={true}
            />
            <h4 className="text-tremor-default font-medium text-red-600 dark:text-red-500">
              Liquiditätswarnung erkannt
            </h4>
          </div>
          <div className="absolute right-0 top-0 pr-1 pt-1">
            <button
              type="button"
              className="rounded-tremor-small p-1 text-tremor-content-subtle hover:text-tremor-content dark:text-dark-tremor-content-subtle hover:dark:text-tremor-content"
              onClick={() => setIsWarningOpen(false)}
              aria-label="Close"
            >
              <RiCloseLine className="size-5 shrink-0" aria-hidden={true} />
            </button>
          </div>
          <p className="mt-2 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
            Die Prognose zeigt einen negativen Kontostand in der kommenden Periode. 
            Überprüfen Sie Ihre Zahlungspläne und erwägen Sie Maßnahmen zur Liquiditätssicherung.
          </p>
        </div>
      ) : null}

      {isPositiveOpen && isIncreasing && !hasNegativeBalance ? (
        <div className="relative mt-4 rounded-tremor-small border border-tremor-border bg-tremor-background-muted p-4 dark:border-dark-tremor-border dark:bg-dark-tremor-background-subtle">
          <div className="flex items-center space-x-2.5">
            <RiArrowRightUpLine
              className="size-5 shrink-0 text-tremor-brand dark:text-dark-tremor-brand"
              aria-hidden={true}
            />
            <h4 className="text-tremor-default font-medium text-tremor-brand dark:text-dark-tremor-brand">
              Positive Entwicklung erwartet
            </h4>
          </div>
          <div className="absolute right-0 top-0 pr-1 pt-1">
            <button
              type="button"
              className="rounded-tremor-small p-1 text-tremor-content-subtle hover:text-tremor-content dark:text-dark-tremor-content-subtle hover:dark:text-tremor-content"
              onClick={() => setIsPositiveOpen(false)}
              aria-label="Close"
            >
              <RiCloseLine className="size-5 shrink-0" aria-hidden={true} />
            </button>
          </div>
          <p className="mt-2 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
            Ihr Kontostand zeigt eine positive Entwicklung über die Prognoseperiode. 
            Die aktuelle Finanzplanung verläuft planmäßig.
          </p>
        </div>
      ) : null}
    </div>
  );
}
