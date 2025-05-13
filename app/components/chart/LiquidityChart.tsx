import React, { useMemo } from 'react';
import { format, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Bar } from 'react-chartjs-2';
import { EnhancedTransaction } from '@/models/types';
import { formatCHF } from '@/lib/currency';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

type AggregationPeriod = 'day' | 'week' | 'month';

interface LiquidityChartProps {
  transactions: EnhancedTransaction[];
  startDate: Date;
  endDate: Date;
  aggregationPeriod?: AggregationPeriod;
  showFinalBalance?: boolean;
}

export default function LiquidityChart({
  transactions,
  startDate,
  endDate,
  aggregationPeriod = 'month',
  showFinalBalance = true
}: LiquidityChartProps) {
  // Group transactions by the specified period
  const chartData = useMemo(() => {
    if (!transactions.length) return { labels: [], income: [], expenses: [], balance: [] };

    let periods: Date[] = [];
    let periodFormat: string;

    // Generate periods based on aggregation level
    switch (aggregationPeriod) {
      case 'day':
        periods = eachDayOfInterval({ start: startDate, end: endDate });
        periodFormat = 'dd.MM.';
        break;
      case 'week':
        periods = eachWeekOfInterval({ start: startDate, end: endDate });
        periodFormat = "'KW'w, MMM";
        break;
      case 'month':
        periods = eachMonthOfInterval({ start: startDate, end: endDate });
        periodFormat = 'MMM yyyy';
        break;
    }

    // Initialize data arrays
    const income: number[] = new Array(periods.length).fill(0);
    const expenses: number[] = new Array(periods.length).fill(0);
    const balance: number[] = new Array(periods.length).fill(0);
    
    // Get labels for each period
    const labels = periods.map(date => format(date, periodFormat, { locale: de }));

    // Group transactions by period
    transactions.forEach(tx => {
      // Find which period this transaction belongs to
      let periodIndex = -1;
      
      switch (aggregationPeriod) {
        case 'day':
          periodIndex = periods.findIndex(p => 
            format(p, 'yyyy-MM-dd') === format(tx.date, 'yyyy-MM-dd')
          );
          break;
        case 'week':
          periodIndex = periods.findIndex(p => {
            const week = format(p, 'w-yyyy');
            const txWeek = format(tx.date, 'w-yyyy');
            return week === txWeek;
          });
          break;
        case 'month':
          periodIndex = periods.findIndex(p => {
            return isWithinInterval(tx.date, {
              start: startOfMonth(p),
              end: endOfMonth(p)
            });
          });
          break;
      }
      
      // Skip if transaction doesn't fit in any period
      if (periodIndex === -1) return;
      
      // Add to appropriate total
      if (tx.direction === 'Incoming') {
        income[periodIndex] += tx.amount;
      } else {
        expenses[periodIndex] += tx.amount;
      }
      
      // Store the final balance for each period using the last transaction's balance
      const existingBalance = balance[periodIndex];
      if (existingBalance === 0 || tx.kontostand) {
        balance[periodIndex] = tx.kontostand || 0;
      }
    });

    return { labels, income, expenses, balance };
  }, [transactions, startDate, endDate, aggregationPeriod]);

  // Chart options
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: false,
        grid: {
          display: false
        }
      },
      y: {
        stacked: false,
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
        text: 'Liquiditätsübersicht',
      },
    },
  };

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Einnahmen',
        data: chartData.income,
        backgroundColor: 'rgba(75, 192, 75, 0.6)',
        borderColor: 'rgb(75, 192, 75)',
        borderWidth: 1
      },
      {
        label: 'Ausgaben',
        data: chartData.expenses.map(v => -v), // Negate for visualization
        backgroundColor: 'rgba(255, 99, 99, 0.6)',
        borderColor: 'rgb(255, 99, 99)',
        borderWidth: 1
      },
      ...(showFinalBalance ? [{
        label: 'Kontostand',
        data: chartData.balance,
        type: 'line' as const,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderWidth: 2,
        pointRadius: 4,
        yAxisID: 'y'
      }] : [])
    ]
  };

  return (
    <div className="w-full h-80 mb-6 mt-2">
      <Bar options={options} data={data as any} />
    </div>
  );
} 