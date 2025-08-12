'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency/format';
import { EnhancedTransaction } from '@/models/types';

interface Props { items: EnhancedTransaction[] }

export function TopOutflows({ items }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="mb-2 text-sm text-gray-600">Größte anstehende Ausgaben (30 Tage)</div>
      <ul className="divide-y divide-gray-100">
        {items.map(t => (
          <li key={t.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-900">{t.details}</div>
              <div className="text-xs text-gray-500">{format(t.date, 'dd.MM.yyyy', { locale: de })}</div>
            </div>
            <div className="text-sm font-medium text-gray-900">{formatCurrency(t.amount)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}


