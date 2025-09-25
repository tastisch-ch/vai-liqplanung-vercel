'use client';

import { useState } from 'react';
import { Card, LineChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const valueFormatter = (number: number) => formatCHF(number);

export function BalanceTrendChart({ isLoading, points }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState('Max.');
  
  if (isLoading) {
    return (
      <Card className="animate-pulse p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="h-72 bg-gray-200 rounded"></div>
      </Card>
    );
  }

  if (!points || points.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
          Kontostand-Prognose
        </div>
        <div className="text-tremor-metric text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
          Keine Daten verfügbar
        </div>
      </Card>
    );
  }

  // Calculate current balance and change
  const currentBalance = points[0]?.balance || 0;
  const finalBalance = points[points.length - 1]?.balance || 0;
  const changeAmount = finalBalance - currentBalance;
  const changePercent = currentBalance !== 0 ? (changeAmount / currentBalance) * 100 : 0;
  const isPositiveChange = changeAmount >= 0;

  // Transform data for chart
  const chartData = points.map(p => {
    const date = new Date(p.date);
    const formattedDate = date.toLocaleDateString('de-CH', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      date: formattedDate,
      'Kontostand': p.balance,
      'Kritische Schwelle': 0
    };
  });

  const periods = ['Last 7d', 'Last 30d', 'Max.'];

  return (
    <Card className="p-6">
      {/* Header with current balance */}
      <div className="mb-6">
        <div className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
          Kontostand-Prognose
        </div>
        <div className="text-tremor-metric text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
          {formatCHF(currentBalance)}
        </div>
        <div className={classNames(
          'text-tremor-default font-medium',
          isPositiveChange 
            ? 'text-emerald-700 dark:text-emerald-500' 
            : 'text-red-700 dark:text-red-500'
        )}>
          {isPositiveChange ? '+' : ''}{formatCHF(changeAmount)} ({isPositiveChange ? '+' : ''}{changePercent.toFixed(1)}%) Prognose Periodenende
        </div>
      </div>

      {/* Period selector */}
      <div className="mb-6">
        <div className="flex space-x-1 rounded-tremor-default bg-tremor-background-muted p-1 dark:bg-dark-tremor-background-muted">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={classNames(
                'flex-1 rounded-tremor-small px-2.5 py-1.5 text-tremor-default font-medium transition-all',
                selectedPeriod === period
                  ? 'bg-tremor-background text-tremor-content-strong shadow-tremor-input dark:bg-dark-tremor-background dark:text-dark-tremor-content-strong dark:shadow-dark-tremor-input'
                  : 'text-tremor-content hover:text-tremor-content-strong dark:text-dark-tremor-content dark:hover:text-dark-tremor-content-strong'
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <LineChart
        data={chartData}
        index="date"
        categories={['Kontostand', 'Kritische Schwelle']}
        colors={['blue', 'red']}
        valueFormatter={valueFormatter}
        yAxisWidth={100}
        showLegend={true}
        className="h-72"
      />

      {/* Summary section */}
      <div className="mt-6">
        <div className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong mb-4">
          Prognose-Zusammenfassung
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
              Aktueller Stand
            </span>
            <span className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
              {formatCHF(currentBalance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
              Prognose Periodenende
            </span>
            <span className={classNames(
              'text-tremor-default font-medium',
              finalBalance >= 0 
                ? 'text-emerald-700 dark:text-emerald-500' 
                : 'text-red-700 dark:text-red-500'
            )}>
              {formatCHF(finalBalance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
              Erwartete Veränderung
            </span>
            <span className={classNames(
              'text-tremor-default font-medium',
              isPositiveChange 
                ? 'text-emerald-700 dark:text-emerald-500' 
                : 'text-red-700 dark:text-red-500'
            )}>
              {isPositiveChange ? '+' : ''}{formatCHF(changeAmount)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
