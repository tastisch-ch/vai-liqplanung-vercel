'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from "@/components/auth/AuthProvider";
import { loadBuchungen, enhanceTransactions } from "@/lib/services/buchungen";
import { getUserSettings } from "@/lib/services/user-settings";
import { EnhancedTransaction } from "@/models/types";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from "date-fns";
import { formatCHF } from "@/lib/currency";
import dynamic from 'next/dynamic';
import { 
  MonthlyDataPoint, 
  CategoryDataPoint, 
  CashFlowDataPoint,
  DateRange as ChartDateRange,
  ChartOptions
} from "@/models/chart-types";

// Dynamically import ECharts components to prevent SSR issues
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function AnalysePage() {
  const { authState } = useAuth();
  const { user } = authState;
  
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // 'month', 'quarter', 'year'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCategories, setShowCategories] = useState<Record<string, boolean>>({
    'Standard': true,
    'Fixkosten': true,
    'Lohn': true,
    'Simulation': false
  });
  
  // Date range based on selected period and current date
  const dateRange = useMemo<ChartDateRange>(() => {
    const now = currentDate;
    
    switch (selectedPeriod) {
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, 'MMMM yyyy')
        };
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = endOfMonth(addMonths(quarterStart, 2));
        return {
          start: quarterStart,
          end: quarterEnd,
          label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
        };
      case 'year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31),
          label: now.getFullYear().toString()
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, 'MMMM yyyy')
        };
    }
  }, [currentDate, selectedPeriod]);
  
  // Fetch transactions
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Load user settings for starting balance
        const settings = await getUserSettings(user.id);
        const startBalance = settings.start_balance;
        
        // Load transactions
        const buchungen = await loadBuchungen(user.id);
        
        // Enhance transactions with running balance
        const enhancedTx = enhanceTransactions(buchungen, startBalance);
        setTransactions(enhancedTx);
      } catch (err) {
        setError('Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user?.id]);
  
  // Filter transactions based on date range and categories
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => 
      isWithinInterval(tx.date, { start: dateRange.start, end: dateRange.end }) &&
      showCategories[tx.kategorie]
    );
  }, [transactions, dateRange, showCategories]);
  
  // Calculate monthly income and expenses
  const monthlyData = useMemo<MonthlyDataPoint[]>(() => {
    const result: {[key: string]: {income: number, expenses: number}} = {};
    
    filteredTransactions.forEach(tx => {
      const monthKey = format(tx.date, 'yyyy-MM');
      if (!result[monthKey]) {
        result[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (tx.direction === 'Incoming') {
        result[monthKey].income += tx.amount;
      } else {
        result[monthKey].expenses += tx.amount;
      }
    });
    
    return Object.entries(result)
      .map(([date, values]) => ({
        date,
        income: values.income,
        expenses: values.expenses,
        balance: values.income - values.expenses
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);
  
  // Options for monthly overview chart
  const monthlyChartOptions: ChartOptions = {
    title: {
      text: 'Monatliche Übersicht',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const date = params[0].name;
        let tooltipText = `<strong>${date}</strong><br/>`;
        
        params.forEach((param: any) => {
          let value = formatCHF(Math.abs(param.value));
          let color = param.seriesIndex === 0 ? 'green' : param.seriesIndex === 1 ? 'red' : 'blue';
          tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span> ${param.seriesName}: ${value}<br/>`;
        });
        
        return tooltipText;
      }
    },
    legend: {
      data: ['Einnahmen', 'Ausgaben', 'Bilanz'],
      bottom: '0%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: monthlyData.map(item => item.date)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatCHF(value)
      }
    },
    series: [
      {
        name: 'Einnahmen',
        type: 'bar',
        stack: 'total',
        data: monthlyData.map(item => item.income),
        itemStyle: {
          color: '#4CAF50'
        }
      },
      {
        name: 'Ausgaben',
        type: 'bar',
        stack: 'total',
        data: monthlyData.map(item => -item.expenses),
        itemStyle: {
          color: '#F44336'
        }
      },
      {
        name: 'Bilanz',
        type: 'line',
        data: monthlyData.map(item => item.balance),
        lineStyle: {
          color: '#2196F3'
        },
        itemStyle: {
          color: '#2196F3'
        }
      }
    ]
  };
  
  // Calculate category distribution
  const categoryData = useMemo<CategoryDataPoint[]>(() => {
    const categoryTotals: {[key: string]: number} = {};
    
    filteredTransactions
      .filter(tx => tx.direction === 'Outgoing')
      .forEach(tx => {
        const category = tx.kategorie;
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += tx.amount;
      });
    
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);
  
  // Options for category distribution chart
  const categoryChartOptions: ChartOptions = {
    title: {
      text: 'Ausgabenverteilung nach Kategorie',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: ${formatCHF(params.value)} (${params.percent}%)`;
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: 'Ausgaben',
        type: 'pie',
        radius: '50%',
        data: categoryData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };
  
  // Calculate cash flow trend
  const cashFlowData = useMemo<CashFlowDataPoint[]>(() => {
    // Get daily balance change
    const dailyBalance: {[key: string]: number} = {};
    let runningBalance = 0;
    
    filteredTransactions
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach(tx => {
        const dateKey = format(tx.date, 'yyyy-MM-dd');
        if (!dailyBalance[dateKey]) {
          dailyBalance[dateKey] = 0;
        }
        
        const amount = tx.direction === 'Incoming' ? tx.amount : -tx.amount;
        dailyBalance[dateKey] += amount;
      });
    
    // Calculate running balance
    const result = Object.entries(dailyBalance)
      .map(([date, change]) => {
        runningBalance += change;
        return {
          date,
          balance: runningBalance
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return result;
  }, [filteredTransactions]);
  
  // Options for cash flow trend chart
  const cashFlowChartOptions: ChartOptions = {
    title: {
      text: 'Cashflow-Entwicklung',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        return `${params[0].name}: ${formatCHF(params[0].value)}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: cashFlowData.map(item => item.date)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatCHF(value)
      }
    },
    series: [
      {
        data: cashFlowData.map(item => item.balance),
        type: 'line',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(58, 71, 212, 0.5)'
              },
              {
                offset: 1,
                color: 'rgba(58, 71, 212, 0.1)'
              }
            ]
          }
        },
        lineStyle: {
          width: 2,
          color: '#3a47d4'
        },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  };
  
  const handleNavigatePeriod = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      switch (selectedPeriod) {
        case 'month':
          setCurrentDate(subMonths(currentDate, 1));
          break;
        case 'quarter':
          setCurrentDate(subMonths(currentDate, 3));
          break;
        case 'year':
          const prevYear = new Date(currentDate);
          prevYear.setFullYear(prevYear.getFullYear() - 1);
          setCurrentDate(prevYear);
          break;
      }
    } else {
      switch (selectedPeriod) {
        case 'month':
          setCurrentDate(addMonths(currentDate, 1));
          break;
        case 'quarter':
          setCurrentDate(addMonths(currentDate, 3));
          break;
        case 'year':
          const nextYear = new Date(currentDate);
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          setCurrentDate(nextYear);
          break;
      }
    }
  };
  
  const toggleCategory = (category: string) => {
    setShowCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Finanzanalyse</h1>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Period selection and navigation */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="flex space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="month">Monat</option>
              <option value="quarter">Quartal</option>
              <option value="year">Jahr</option>
            </select>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleNavigatePeriod('prev')}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
              >
                &lt;
              </button>
              <span className="font-medium">{dateRange.label}</span>
              <button 
                onClick={() => handleNavigatePeriod('next')}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
              >
                &gt;
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap space-x-2">
            <span className="text-sm text-gray-500 mr-2">Kategorien:</span>
            {Object.entries(showCategories).map(([category, isShown]) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`text-xs px-3 py-1 rounded-full ${
                  isShown 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {category} {isShown ? '✓' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Daten werden geladen...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Overview Chart */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="h-80">
              <ReactECharts option={monthlyChartOptions} style={{ height: '100%' }} />
            </div>
          </div>
          
          {/* Two-column layout for smaller charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Distribution Chart */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="h-80">
                <ReactECharts option={categoryChartOptions} style={{ height: '100%' }} />
              </div>
            </div>
            
            {/* Cash Flow Trend Chart */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="h-80">
                <ReactECharts option={cashFlowChartOptions} style={{ height: '100%' }} />
              </div>
            </div>
          </div>
          
          {/* Summary Section */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="text-lg font-medium mb-4">Zusammenfassung für {dateRange.label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="text-sm font-medium text-green-800">Einnahmen</h4>
                <p className="text-2xl font-bold text-green-700">
                  {formatCHF(filteredTransactions.reduce((sum, tx) => 
                    tx.direction === 'Incoming' ? sum + tx.amount : sum, 0))}
                </p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="text-sm font-medium text-red-800">Ausgaben</h4>
                <p className="text-2xl font-bold text-red-700">
                  {formatCHF(filteredTransactions.reduce((sum, tx) => 
                    tx.direction === 'Outgoing' ? sum + tx.amount : sum, 0))}
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800">Bilanz</h4>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCHF(filteredTransactions.reduce((sum, tx) => 
                    tx.direction === 'Incoming' ? sum + tx.amount : sum - tx.amount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 