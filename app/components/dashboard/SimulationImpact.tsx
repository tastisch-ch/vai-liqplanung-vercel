'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency/format';
import { EnhancedTransaction } from '@/models/types';

interface Props { delta: number; items: EnhancedTransaction[] }

export function SimulationImpact({ delta, items }: Props) {
  const deltaClass = delta >= 0 ? 'text-green-600' : 'text-red-600';
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">Simulationseffekte (bis Monatsende)</div>
        <div className={`text-sm font-medium ${deltaClass}`}>{formatCurrency(delta)}</div>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map(t => (
          <li key={t.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-900">🔮 {t.details}</div>
              <div className="text-xs text-gray-500">{format(t.date, 'dd.MM.yyyy', { locale: de })}</div>
            </div>
            <div className={`text-sm font-medium ${t.direction === 'Incoming' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}


