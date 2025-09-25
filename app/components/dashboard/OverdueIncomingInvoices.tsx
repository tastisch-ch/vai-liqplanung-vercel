'use client';
import { formatCHF } from '@/lib/currency';
import { EnhancedTransaction } from '@/models/types';
import { differenceInDays } from 'date-fns';

interface Props {
  items: EnhancedTransaction[];
}

export function OverdueIncomingInvoices({ items }: Props) {
  const count = items.length;
  const total = items.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-shadow duration-300 hover:border-emerald-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="9" x2="16" y2="9"></line>
            <line x1="8" y1="13" x2="12" y2="13"></line>
          </svg>
          <dt className="text-sm font-medium text-gray-600">Überfällige Kundenrechnungen</dt>
        </div>
        <span className="text-xs text-gray-500">{count} Rechnungen</span>
      </div>
      <div className="flex items-baseline gap-2 text-gray-900">
        <span className="text-2xl font-bold">{formatCHF(total)}</span>
      </div>
      <div className="mt-6 flex justify-between text-xs text-gray-500">
        <span>Rechnung & Kunde</span>
        <span>Betrag</span>
      </div>
      <ul role="list" className="mt-2 space-y-2">
        {items.slice(0, 8).map((t) => {
          const invoice = (t as any).invoice_id || extractInvoiceFromDetails(t.details);
          const customer = extractCustomerFromDetails(t.details);
          const overdueDays = differenceInDays(new Date(), new Date(t.date));
          return (
            <li
              key={t.id}
              className="relative flex w-full items-center space-x-3 rounded-lg bg-gray-50 p-2 hover:bg-gray-100"
            >
              <span className="inline-flex min-w-20 justify-center rounded bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white">
                {invoice ? String(invoice).toUpperCase() : '–'}
              </span>
              <p className="flex w-full items-center justify-between space-x-4 truncate text-sm font-medium">
                <span className="truncate text-gray-700">
                  {customer || t.details}
                  <span className="ml-2 text-xs text-gray-500">({overdueDays} Tage überfällig)</span>
                </span>
                <span className="pr-1.5 text-gray-900 font-semibold">
                  {formatCHF(t.amount)}
                </span>
              </p>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Keine überfälligen Rechnungen</li>
        )}
      </ul>
    </div>
  );
}

function extractInvoiceFromDetails(details?: string | null): string | undefined {
  if (!details) return undefined;
  // try patterns like "12345 - Customer" or "Invoice #12345 - Customer"
  const m = details.match(/(?:Invoice\s*#)?([\w-]+)/i);
  return m?.[1];
}

function extractCustomerFromDetails(details?: string | null): string | undefined {
  if (!details) return undefined;
  const parts = details.split(' - ');
  return parts.length > 1 ? parts.slice(1).join(' - ') : undefined;
}


