'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { formatCHF } from '@/lib/currency/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface KontostandChartProps {
  data: {
    date: string;
    balance: number;
  }[];
}

export function KontostandChart({ data }: KontostandChartProps) {
  const chartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: 'Kontostand',
        data: data.map(item => item.balance),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Kontostand Entwicklung',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Kontostand: ${formatCHF(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return formatCHF(value);
          }
        }
      }
    }
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-lg shadow p-4">
      <Line options={options} data={chartData} />
    </div>
  );
} 