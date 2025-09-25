'use client';

import { List, ListItem } from '@tremor/react';
import { formatCHF } from '@/lib/currency';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip } from 'recharts';

interface Item { name: string; amount: number }
interface Props { data: Item[] }

function classNames(...classes: string[]) { return classes.filter(Boolean).join(' '); }

const chartColors = ['#06b6d4','#3b82f6','#6366f1','#8b5cf6','#d946ef','#10b981','#f59e0b','#ef4444'];
const bgPalette = ['bg-cyan-500','bg-blue-500','bg-indigo-500','bg-violet-500','bg-fuchsia-500','bg-emerald-500','bg-amber-500','bg-rose-500'];

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
      <div className="mt-6 h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={shares}
              dataKey="amount"
              nameKey="name"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={1}
            >
              {shares.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <RTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-6 flex items-center justify-between text-xs text-gray-500">
        <span>Kategorie</span>
        <span>Betrag / Anteil</span>
      </p>
      <List className="mt-2 text-sm">
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

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const name = p?.payload?.name;
  const amount = p?.payload?.amount as number;
  const share = p?.payload?.share as string;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-xs text-gray-500 mb-1">{name}</div>
      <div className="text-sm font-semibold text-gray-900">{formatCHF(amount)}</div>
      <div className="text-xs text-gray-600 mt-0.5">{share}</div>
    </div>
  );
}


