'use client';

interface Props {
  currentBalance: number;
  runwayMonths: number;
  firstNegativeDate: Date | null;
}

export function Alerts({ currentBalance, runwayMonths, firstNegativeDate }: Props) {
  const alerts: { type: 'error' | 'warning'; text: string }[] = [];
  if (firstNegativeDate) {
    alerts.push({ type: 'error', text: `Unterdeckung ab ${firstNegativeDate.toLocaleDateString('de-CH')}` });
  }
  if (Number.isFinite(runwayMonths) && runwayMonths < 2) {
    alerts.push({ type: 'warning', text: `Runway unter 2 Monaten (${runwayMonths.toFixed(1)} Monate)` });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div key={i} className={`rounded-md p-3 ${a.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
          {a.text}
        </div>
      ))}
    </div>
  );
}


