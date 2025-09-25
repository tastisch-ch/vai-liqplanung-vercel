'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCHF } from '@/lib/currency';
import { EnhancedTransaction } from '@/models/types';

interface Props { items: EnhancedTransaction[] }

export function UpcomingLargeOutflows({ items }: Props) {
  const count = items.length;
  const total = items.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-shadow duration-300 hover:border-emerald-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v18"/><path d="M19 12H5"/>
          </svg>
          <h3 className="text-sm font-medium text-gray-600">Größere anstehende Ausgaben (&gt; 5’000)</h3>
        </div>
        <span className="text-xs text-gray-500">{count} • {formatCHF(total)}</span>
      </div>
      <div className="mt-2 space-y-2">
        {items.slice(0, 8).map(t => (
          <div key={t.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{t.details}</div>
              <div className="text-xs text-gray-500">{format(t.date, 'dd.MM.yyyy', { locale: de })}</div>
            </div>
            <div className="text-sm font-semibold text-red-600">{formatCHF(t.amount)}</div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Keine großen Ausgaben in den nächsten Wochen</div>
        )}
      </div>
    </div>
  );
}


