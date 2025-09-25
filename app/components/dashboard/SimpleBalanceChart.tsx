'use client';

import { useMemo, useState } from 'react';
import { RiArrowRightUpLine, RiCloseLine } from '@remixicon/react';
import { LineChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

const valueFormatter = (number: number) => formatCHF(number);

export function SimpleBalanceChart({ isLoading, points }: Props) {
  const [isWarningOpen, setIsWarningOpen] = useState(true);
  const [isPositiveOpen, setIsPositiveOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="mb-2 text-sm text-gray-600">Kontostand-Prognose</h3>
        <p className="text-2xl font-semibold text-gray-900">Keine Daten</p>
      </div>
    );
  }

  // Transform data for LineChart (memoized)
  const chartData = useMemo(() => {
    return points.map(p => {
      const d = new Date(p.date);
      const label = d.toLocaleDateString('de-CH', { month: 'short', day: 'numeric' });
      return { date: label, Kontostand: p.balance };
    });
  }, [points]);

  // Derived metrics (memoized)
  const firstBalance = useMemo(() => points[0]?.balance || 0, [points]);
  const currentBalance = useMemo(() => points[points.length - 1]?.balance || 0, [points]);
  const isIncreasing = useMemo(() => currentBalance > firstBalance, [currentBalance, firstBalance]);
  const hasNegativeBalance = useMemo(() => points.some(p => p.balance < 0), [points]);
  const firstNegativeDate = useMemo(() => points.find(p => p.balance < 0)?.date || null, [points]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="mb-2 text-sm text-gray-600">Kontostand-Prognose</h3>
      <p className="text-2xl font-semibold text-gray-900">{formatCHF(currentBalance)}</p>
      
      <LineChart
        data={chartData}
        index="date"
        categories={['Kontostand']}
        colors={['blue']}
        showLegend={false}
        valueFormatter={valueFormatter}
        showYAxis={true}
        yAxisWidth={60}
        showXAxis={true}
        showGridLines={true}
        className="mt-6 hidden h-48 sm:block"
      />
      
      <LineChart
        data={chartData}
        index="date"
        categories={['Kontostand']}
        colors={['blue']}
        showLegend={false}
        valueFormatter={valueFormatter}
        startEndOnly={true}
        showYAxis={false}
        className="mt-6 h-48 sm:hidden"
      />

      {isWarningOpen && hasNegativeBalance ? (
        <div className="relative mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center space-x-2.5">
            <RiArrowRightUpLine
              className="size-5 shrink-0 text-red-600"
              aria-hidden={true}
            />
            <h4 className="text-sm font-medium text-red-700">
              Negativer Kontostand erwartet{firstNegativeDate ? ` ab ${new Date(firstNegativeDate).toLocaleDateString('de-CH')}` : ''}
            </h4>
          </div>
          <div className="absolute right-0 top-0 pr-1 pt-1">
            <button
              type="button"
              className="rounded-md p-1 text-gray-400 hover:text-gray-600"
              onClick={() => setIsWarningOpen(false)}
              aria-label="Close"
            >
              <RiCloseLine className="size-5 shrink-0" aria-hidden={true} />
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-red-800">
            Prognose fällt unter 0. Bitte Planung prüfen.
          </p>
        </div>
      ) : null}

      {isPositiveOpen && isIncreasing && !hasNegativeBalance ? (
        <div className="relative mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center space-x-2.5">
            <RiArrowRightUpLine
              className="size-5 shrink-0 text-emerald-600"
              aria-hidden={true}
            />
            <h4 className="text-sm font-medium text-emerald-700">
              Positive Entwicklung erwartet
            </h4>
          </div>
          <div className="absolute right-0 top-0 pr-1 pt-1">
            <button
              type="button"
              className="rounded-md p-1 text-gray-400 hover:text-gray-600"
              onClick={() => setIsPositiveOpen(false)}
              aria-label="Close"
            >
              <RiCloseLine className="size-5 shrink-0" aria-hidden={true} />
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            Kontostand steigt über den Zeitraum.
          </p>
        </div>
      ) : null}
    </div>
  );
}
