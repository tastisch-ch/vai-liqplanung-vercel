'use client';

import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { formatCurrency } from '@/lib/currency/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

export function ForecastChart({ isLoading, points }: Props) {
  if (isLoading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-[400px]" />;
  }

  if (!points || points.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Keine Daten verfügbar</p>
        <p className="text-sm text-gray-400 mt-2">Bitte aktualisieren Sie den Kontostand in der Seitenleiste</p>
      </div>
    );
  }

  const labels = points.map(p => p.date);
  const data = {
    labels,
    datasets: [
      {
        label: 'Kontostand-Prognose',
        data: points.map(p => p.balance),
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
  const options: any = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: number) => formatCurrency(value),
        },
      },
    },
  };

  return (
    <div className="w-full h-[420px] bg-white rounded-lg shadow p-4">
      <div className="mb-2 text-sm text-gray-600">Kontostand-Prognose</div>
      <Line data={data} options={options} />
    </div>
  );
}


