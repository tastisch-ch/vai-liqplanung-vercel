'use client';

import { Card } from '@tremor/react';
import { formatCHF } from '@/lib/currency';
import { EnhancedTransaction } from '@/models/types';

interface Props {
  items: EnhancedTransaction[];
}

export function OverdueIncomingInvoices({ items }: Props) {
  const count = items.length;
  const total = items.reduce((s, t) => s + t.amount, 0);

  return (
    <Card>
      <dt className="text-tremor-default font-medium text-tremor-content dark:text-dark-tremor-content flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">💶</span>
        Überfällige Kundenrechnungen
      </dt>
      <dd className="mt-1 flex items-baseline space-x-2 text-tremor-content-strong dark:text-dark-tremor-content-strong">
        <span className="text-tremor-metric font-semibold">{formatCHF(total)}</span>
        <span className="text-tremor-default font-medium">({count})</span>
      </dd>
      <dd className="mt-6 flex justify-between text-tremor-label text-tremor-content dark:text-dark-tremor-content">
        <span>Rechnung</span>
        <span>Betrag</span>
      </dd>
      <ul role="list" className="mt-2 space-y-2">
        {items.slice(0, 8).map((t) => {
          const invoice = (t as any).invoice_id || extractInvoiceFromDetails(t.details);
          const customer = extractCustomerFromDetails(t.details);
          return (
            <li
              key={t.id}
              className="relative flex w-full items-center space-x-3 rounded-tremor-small bg-tremor-background-subtle/60 p-1 hover:bg-tremor-background-subtle dark:bg-dark-tremor-background-subtle/60 hover:dark:bg-dark-tremor-background-subtle"
            >
              <span className="inline-flex w-24 justify-center rounded bg-emerald-500 py-1.5 text-tremor-default font-semibold text-tremor-brand-inverted dark:text-dark-tremor-brand-inverted">
                {invoice || '–'}
              </span>
              <p className="flex w-full items-center justify-between space-x-4 truncate text-tremor-default font-medium">
                <span className="truncate text-tremor-content dark:text-dark-tremor-content">
                  {customer || t.details}
                </span>
                <span className="pr-1.5 text-tremor-content-strong dark:text-dark-tremor-content-strong">
                  {formatCHF(t.amount)}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
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


