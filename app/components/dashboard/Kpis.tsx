'use client';

import { formatCurrency } from '@/lib/currency/format';

interface KpisProps {
  currentBalance: number;
  net30: number;
  runwayMonths: number; // Infinity -> anzeigen als "∞"
  eomForecast: number;
  openIncoming: { count: number; sum: number };
  openOutgoing: { count: number; sum: number };
}

export function Kpis({ currentBalance, net30, runwayMonths, eomForecast, openIncoming, openOutgoing }: KpisProps) {
  const runwayText = !isFinite(runwayMonths) ? '∞' : `${runwayMonths.toFixed(1)} Monate`;
  const netClass = net30 >= 0 ? 'text-green-600' : 'text-red-600';

  const cards = [
    { title: 'Kontostand', value: formatCurrency(currentBalance) },
    { title: 'Netto-Cashflow (30 Tage)', value: formatCurrency(net30), extraClass: netClass },
    { title: 'Runway', value: runwayText },
    { title: 'EOM-Prognose', value: formatCurrency(eomForecast) },
    { title: 'Offene Rechnungen (Eingehend)', value: `${openIncoming.count} • ${formatCurrency(openIncoming.sum)}` },
    { title: 'Offene Rechnungen (Ausgehend)', value: `${openOutgoing.count} • ${formatCurrency(openOutgoing.sum)}` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c, idx) => (
        <div key={idx} className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">{c.title}</div>
          <div className={`mt-2 text-2xl font-semibold ${c.extraClass ?? ''}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}


