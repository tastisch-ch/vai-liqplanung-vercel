import React from 'react';
import { Line } from 'react-chartjs-2';
import { formatCHF } from '@/lib/currency';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CashFlowChartProps {
  labels: string[];
  inflows: number[];
  outflows: number[];
  netFlow: number[];
}

export default function CashFlowChart({ labels, inflows, outflows, netFlow }: CashFlowChartProps) {
  // Chart options
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        ticks: {
          callback: (value) => formatCHF(value as number)
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            return `${context.dataset.label}: ${formatCHF(value)}`;
          }
        }
      },
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Cash Flow Übersicht',
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'Einnahmen',
        data: inflows,
        borderColor: 'rgb(75, 192, 75)',
        backgroundColor: 'rgba(75, 192, 75, 0.1)',
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: 'Ausgaben',
        data: outflows,
        borderColor: 'rgb(255, 99, 99)',
        backgroundColor: 'rgba(255, 99, 99, 0.1)',
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: 'Netto Cash Flow',
        data: netFlow,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: true
      }
    ]
  };

  return (
    <div className="w-full h-80 mb-6 mt-2">
      <Line options={options} data={data as any} />
    </div>
  );
} 