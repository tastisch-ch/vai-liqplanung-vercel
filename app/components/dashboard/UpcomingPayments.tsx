'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency/format';
import { EnhancedTransaction } from '@/models/types';

interface Props { items: EnhancedTransaction[] }

export function UpcomingPayments({ items }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="mb-2 text-sm text-gray-600">Fällige Zahlungen (14 Tage)</div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Datum</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Details</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Betrag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-sm text-gray-600">{format(t.date, 'dd.MM.yyyy', { locale: de })}</td>
                <td className="px-3 py-2 text-sm text-gray-900">{t.details}</td>
                <td className="px-3 py-2 text-sm text-right text-gray-900">{formatCurrency(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


