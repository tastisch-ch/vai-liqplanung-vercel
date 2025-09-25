'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCHF } from '@/lib/currency';
import { EnhancedTransaction } from '@/models/types';

interface Props { items: EnhancedTransaction[]; delta: number }

export function SimulationEffectsCard({ items, delta }: Props) {
  const color = delta >= 0 ? 'text-emerald-600' : 'text-red-600';
  const badge = delta >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';
  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-shadow duration-300 hover:border-emerald-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          <h3 className="text-sm font-medium text-gray-600">Simulationseffekte (bis Monatsende)</h3>
        </div>
        <span className={`text-xs rounded px-2 py-0.5 ${badge}`}>{formatCHF(delta)}</span>
      </div>
      <div className="mt-2 space-y-2">
        {items.slice(0,8).map(t => (
          <div key={t.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{t.details}</div>
              <div className="text-xs text-gray-500">{format(t.date, 'dd.MM.yyyy', { locale: de })}</div>
            </div>
            <div className={`text-sm font-semibold ${t.direction === 'Incoming' ? 'text-emerald-600' : 'text-red-600'}`}>{formatCHF(t.amount)}</div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Keine aktiven Simulationen bis Monatsende</div>
        )}
      </div>
    </div>
  );
}


