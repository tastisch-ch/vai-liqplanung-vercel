'use client';

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { formatCurrency } from '@/lib/currency/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props { data: { month: string; value: number }[] }

export function MonthlyCashflow({ data }: Props) {
  const labels = data.map(d => d.month);
  const dataset = data.map(d => d.value);
  const colors = dataset.map(v => (v >= 0 ? 'rgba(22,163,74,0.6)' : 'rgba(220,38,38,0.6)'));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="mb-2 text-sm text-gray-600">Monatlicher Cashflow</div>
      <Bar
        data={{
          labels,
          datasets: [{ label: 'Cashflow', data: dataset, backgroundColor: colors }],
        }}
        options={{
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: { label: (ctx: any) => ` ${formatCurrency(ctx.parsed.y)}` },
            },
            legend: { display: false },
          },
          scales: {
            y: { ticks: { callback: (v: number) => formatCurrency(v) } },
          },
        }}
      />
    </div>
  );
}


