import React from 'react';
import { Pie } from 'react-chartjs-2';
import { formatCHF } from '@/lib/currency';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface CategoryData {
  category: string;
  amount: number;
}

interface ExpensePieChartProps {
  data: CategoryData[];
}

export default function ExpensePieChart({ data }: ExpensePieChartProps) {
  // Generate unique but deterministic colors based on category name
  const generateColor = (category: string, alpha: number = 1): string => {
    const hash = Array.from(category).reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);
    
    // Use different color hues for different categories, but ensure primary VAI colors
    // for common categories
    let hue = Math.abs(hash) % 360;
    
    // Map certain categories to VAIOS brand colors
    if (category.toLowerCase().includes('miete') || category === 'Office') {
      return alpha < 1 ? 'rgba(2, 64, 61, ' + alpha + ')' : '#02403D'; // Primary VAIOS
    } else if (category.toLowerCase().includes('lohn') || category === 'Lohn') {
      return alpha < 1 ? 'rgba(173, 199, 200, ' + alpha + ')' : '#ADC7C8'; // Teal VAIOS
    } else if (category === 'Standard' || category === 'Allgemein') {
      return alpha < 1 ? 'rgba(77, 127, 128, ' + alpha + ')' : '#4D7F80'; // Medium teal
    }
    
    return `hsla(${hue}, 70%, 60%, ${alpha})`;
  };

  // Sort by amount descending
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);
  
  // Generate chart data
  const chartData = {
    labels: sortedData.map(item => item.category),
    datasets: [
      {
        label: 'Ausgaben nach Kategorie',
        data: sortedData.map(item => item.amount),
        backgroundColor: sortedData.map(item => generateColor(item.category, 0.7)),
        borderColor: sortedData.map(item => generateColor(item.category)),
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 15,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = context.dataset.data.reduce((sum: any, val: any) => sum + val, 0);
            const percentage = Math.round((value / total) * 100);
            return `${context.label}: ${formatCHF(value)} (${percentage}%)`;
          }
        }
      },
      title: {
        display: true,
        text: 'Ausgaben nach Kategorie',
        font: {
          size: 16
        }
      }
    }
  };

  return (
    <div className="w-full h-64 mb-6 mt-2">
      <Pie options={options} data={chartData} />
    </div>
  );
} 