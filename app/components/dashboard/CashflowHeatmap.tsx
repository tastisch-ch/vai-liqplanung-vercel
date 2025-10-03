"use client";

import { useMemo, useState } from 'react';
import { addMonths, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { EnhancedTransaction } from '@/models/types';
import { formatCHF } from '@/lib/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';

type Props = {
  transactions: EnhancedTransaction[];
  initialMonth?: Date;
};

type DayItem = {
  date: Date;
  net: number;
  txs: EnhancedTransaction[];
};

function percentile(items: number[], p: number): number {
  if (items.length === 0) return 0;
  const sorted = [...items].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return Math.abs(sorted[idx]);
}

function classForNet(net: number, scale: number): string {
  if (net === 0 || scale === 0) return 'bg-gray-100 dark:bg-neutral-900 text-gray-600 dark:text-gray-300';
  const n = Math.min(1, Math.abs(net) / scale);
  // 4 intensity buckets
  const bucket = n >= 0.9 ? 4 : n >= 0.6 ? 3 : n >= 0.3 ? 2 : 1;
  if (net > 0) {
    switch (bucket) {
      case 4: return 'bg-emerald-600 text-white';
      case 3: return 'bg-emerald-500 text-white';
      case 2: return 'bg-emerald-300 text-emerald-950';
      default: return 'bg-emerald-200 text-emerald-900';
    }
  } else {
    switch (bucket) {
      case 4: return 'bg-rose-600 text-white';
      case 3: return 'bg-rose-500 text-white';
      case 2: return 'bg-rose-300 text-rose-950';
      default: return 'bg-rose-200 text-rose-900';
    }
  }
}

export function CashflowHeatmap({ transactions, initialMonth }: Props) {
  const [month, setMonth] = useState<Date>(initialMonth ?? startOfMonth(new Date()));
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DayItem | null>(null);

  const grid = useMemo(() => {
    const mStart = startOfMonth(month);
    const mEnd = endOfMonth(month);
    const gStart = startOfWeek(mStart, { weekStartsOn: 1 });
    const gEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
    // group transactions by day key
    const keyOf = (d: Date) => format(d, 'yyyy-MM-dd');
    const byDay = new Map<string, EnhancedTransaction[]>();
    for (const t of transactions) {
      if (t.date >= gStart && t.date <= gEnd) {
        const key = keyOf(t.date);
        const arr = byDay.get(key) || [];
        arr.push(t);
        byDay.set(key, arr);
      }
    }
    const days: DayItem[] = [];
    for (let d = gStart; d <= gEnd; d = addDays(d, 1)) {
      const key = keyOf(d);
      const txs = byDay.get(key) || [];
      const net = txs.reduce((s, t) => s + (t.direction === 'Incoming' ? t.amount : -t.amount), 0);
      days.push({ date: d, net, txs });
    }
    const absValues = days.map(d => Math.abs(d.net)).filter(v => v > 0);
    const p80 = percentile(absValues, 80) || Math.max(...absValues, 0);
    return { days, scale: p80 };
  }, [transactions, month]);

  const openDay = (day: DayItem) => {
    setSelected(day);
    setOpen(true);
  };

  const monthLabel = format(month, 'MMMM yyyy', { locale: de });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-950 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Cashflow-Heatmap</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-neutral-900"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            {format(addMonths(month, -1), 'MMM', { locale: de })}
          </button>
          <div className="text-sm text-gray-700 dark:text-gray-300 min-w-[9ch] text-center">{monthLabel}</div>
          <button
            type="button"
            className="px-2 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-neutral-900"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            {format(addMonths(month, 1), 'MMM', { locale: de })}
          </button>
          <button
            type="button"
            className="ml-2 px-2 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-neutral-900"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Heute
          </button>
        </div>
      </div>

      <div className="px-3 pt-3">
        <div className="grid grid-cols-7 gap-1">
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d => (
            <div key={d} className="text-[11px] text-gray-500 dark:text-gray-400 text-center py-1">{d}</div>
          ))}
          {grid.days.map((day) => {
            const inMonth = isSameMonth(day.date, month);
            const isNow = isToday(day.date);
            const cls = classForNet(day.net, grid.scale);
            return (
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => openDay(day)}
                className={`relative h-12 sm:h-14 rounded-md border ${inMonth ? 'border-gray-100 dark:border-white/5' : 'border-transparent opacity-60'} ${cls} hover:brightness-95 transition`}
              >
                <div className="absolute top-1 left-1 text-[11px] font-medium">
                  <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full ${isNow ? 'ring-2 ring-black/70 dark:ring-white/70' : ''}`}>
                    {format(day.date, 'd')}
                  </span>
                </div>
                {day.net !== 0 && (
                  <div className="absolute bottom-1 right-1 text-[10px] font-semibold tabular-nums">
                    {day.net > 0 ? '+' : '−'}{Math.abs(day.net) >= 1000 ? `${Math.round(Math.abs(day.net)/1000)}k` : Math.round(Math.abs(day.net))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 justify-end py-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span>−</span>
          <div className="h-3 w-3 rounded-sm bg-rose-200" />
          <div className="h-3 w-3 rounded-sm bg-rose-500" />
          <span className="mx-1">Netto</span>
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <div className="h-3 w-3 rounded-sm bg-emerald-200" />
          <span>+</span>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? format(selected.date, 'EEEE, dd.MM.yyyy', { locale: de }) : ''}
            </DialogTitle>
            <DialogDescription>
              Netto: {formatCHF(Math.abs(selected?.net || 0))} {selected && selected.net !== 0 ? (selected.net > 0 ? '(Zufluss)' : '(Abfluss)') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
            {selected && selected.txs.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-300">Keine Transaktionen</div>
            )}
            <ul className="space-y-2">
              {selected?.txs.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 bg-white dark:bg-neutral-950">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[60ch]" title={t.details}>{t.details}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t.kategorie || '—'}{t.kostenstelle ? ` • ${t.kostenstelle}` : ''}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold tabular-nums ${t.direction === 'Incoming' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.direction === 'Incoming' ? '+' : '−'}{formatCHF(Math.abs(t.amount))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <button type="button" className="mt-2 inline-flex items-center rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-950 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900">Schliessen</button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CashflowHeatmap;


