'use client';

import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props { data: { label: string; value: number }[] }

export function CostBreakdown({ data }: Props) {
  const labels = data.map(d => d.label);
  const values = data.map(d => d.value);
  const palette = ['#60a5fa', '#f59e0b', '#ef4444', '#a78bfa', '#34d399', '#f472b6'];
  const colors = labels.map((_, i) => palette[i % palette.length]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="mb-2 text-sm text-gray-600">Kostenstruktur (letzter Monat)</div>
      <Pie
        data={{
          labels,
          datasets: [{ data: values, backgroundColor: colors }],
        }}
        options={{ responsive: true }}
      />
    </div>
  );
}


