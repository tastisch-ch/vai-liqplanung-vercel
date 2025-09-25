'use client';

import { DonutChart, List, ListItem } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Item { name: string; amount: number }
interface Props { data: Item[] }

function classNames(...classes: string[]) { return classes.filter(Boolean).join(' '); }

const palette = ['cyan', 'blue', 'indigo', 'violet', 'fuchsia', 'emerald', 'rose', 'amber'];
const bgPalette = ['bg-cyan-500','bg-blue-500','bg-indigo-500','bg-violet-500','bg-fuchsia-500','bg-emerald-500','bg-rose-500','bg-amber-500'];

export function CostStructureDonut({ data }: Props) {
  const sorted = [...data].sort((a,b) => b.amount - a.amount);
  const total = sorted.reduce((s,d)=> s + Math.max(0, d.amount), 0);
  // keep top 5, aggregate rest
  const top = sorted.slice(0,5);
  const restSum = sorted.slice(5).reduce((s,d)=> s + Math.max(0, d.amount), 0);
  const series = restSum > 0 ? [...top, { name: 'Andere', amount: restSum }] : top;
  const shares = series.map(s => ({...s, share: total ? `${((s.amount/total)*100).toFixed(1)}%` : '0%'}));

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-shadow duration-300 hover:border-emerald-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 12 2v10z"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          <h3 className="text-sm font-medium text-gray-600">Kostenstruktur (letzter Monat)</h3>
        </div>
        <span className="text-xs text-gray-500">{formatCHF(total)}</span>
      </div>
      <DonutChart
        className="mt-6"
        data={shares}
        category="amount"
        index="name"
        valueFormatter={(n:number)=>formatCHF(n)}
        showTooltip={true}
        colors={palette as any}
      />
      <p className="mt-6 flex items-center justify-between text-xs text-gray-500">
        <span>Kategorie</span>
        <span>Betrag / Anteil</span>
      </p>
      <List className="mt-2">
        {shares.map((item, i) => (
          <ListItem key={item.name} className="space-x-6">
            <div className="flex items-center space-x-2.5 truncate">
              <span className={classNames(bgPalette[i % bgPalette.length], 'size-2.5 shrink-0 rounded-sm')} aria-hidden={true} />
              <span className="truncate text-gray-700">{item.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium tabular-nums text-gray-900">{formatCHF(item.amount)}</span>
              <span className="rounded px-1.5 py-0.5 text-xs font-medium tabular-nums bg-gray-100 text-gray-700">{item.share}</span>
            </div>
          </ListItem>
        ))}
      </List>
    </div>
  );
}


