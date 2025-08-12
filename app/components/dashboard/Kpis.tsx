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
    { title: 'Kontostand', value: formatCurrency(currentBalance), tooltip: 'Aktueller globaler Kontostand' },
    { title: 'Netto-Cashflow (30 Tage)', value: formatCurrency(net30), extraClass: netClass, tooltip: 'Summe erwarteter Cashflows der nächsten 30 Tage' },
    { title: 'Runway', value: runwayText, tooltip: 'Monate bis 0 basierend auf 3‑Monats‑Burn' },
    { title: 'EOM-Prognose', value: formatCurrency(eomForecast), tooltip: 'Prognostizierter Kontostand am Monatsende' },
    { title: 'Offene Rechnungen (Eingehend)', value: `${openIncoming.count} • ${formatCurrency(openIncoming.sum)}`, tooltip: 'Noch nicht beglichene Eingangsrechnungen' },
    { title: 'Offene Rechnungen (Ausgehend)', value: `${openOutgoing.count} • ${formatCurrency(openOutgoing.sum)}`, tooltip: 'Noch offene Ausgangsrechnungen' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c, idx) => (
        <div key={idx} className="rounded-lg border bg-white p-4 shadow-sm" title={c.tooltip}>
          <div className="text-sm text-gray-500">{c.title}</div>
          <div className={`mt-2 text-2xl font-semibold ${c.extraClass ?? ''}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}


