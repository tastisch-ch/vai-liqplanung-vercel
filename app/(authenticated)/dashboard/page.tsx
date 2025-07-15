'use client';

import { KontostandChart } from '@/app/components/chart/KontostandChart';
import { getCurrentBalance } from '@/lib/services/daily-balance';
import { getAllTransactionsForPlanning } from '@/lib/services/buchungen';
import { enhanceTransactionsSync } from '@/lib/services/buchungen';
import { DailyBalanceSnapshot, Simulation, Buchung } from '@/models/types';
import { useState, useEffect } from 'react';
import { addMonths, subMonths, startOfDay } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState(3); // Default 3 months
  const [chartData, setChartData] = useState<{ date: string; balance: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = useAuth();

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const today = startOfDay(new Date());
        // Start from 1 month ago
        const startDate = subMonths(today, 1);
        const endDate = addMonths(today, timeRange);
        
        console.log('Date range:', { startDate, endDate });
        
        // Get current balance first
        const currentBalance = await getCurrentBalance();
        console.log('Current balance:', currentBalance);
        
        if (!auth.authState.user?.id) {
          console.error('No user ID available');
          return;
        }

        // Get all transactions including fixed costs, simulations, and salary costs
        const allTransactions = await getAllTransactionsForPlanning(
          auth.authState.user.id,
          startDate,
          endDate,
          {
            includeFixkosten: true,
            includeSimulationen: true,
            includeLohnkosten: true
          }
        );
        
        console.log('Loaded transactions:', allTransactions);
        
        // Sort transactions by date
        const sortedTransactions = allTransactions.sort((a, b) => 
          a.date.getTime() - b.date.getTime()
        );
        
        // Enhance transactions with running balance
        const enhancedTransactions = enhanceTransactionsSync(
          sortedTransactions,
          currentBalance.balance
        );
        
        console.log('Enhanced transactions:', enhancedTransactions);
        
        // Convert to chart data format
        const chartData = enhancedTransactions.map(tx => ({
          date: tx.date.toISOString().split('T')[0],
          balance: tx.kontostand || 0
        }));
        
        // Add current balance point if not in transactions
        const todayStr = today.toISOString().split('T')[0];
        if (!chartData.find(d => d.date === todayStr)) {
          chartData.unshift({
            date: todayStr,
            balance: currentBalance.balance
          });
        }
        
        // Sort by date
        chartData.sort((a, b) => a.date.localeCompare(b.date));
        
        console.log('Final chart data:', chartData);
        
        setChartData(chartData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [timeRange, auth.authState.user?.id]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value={1}>1 Monat</option>
          <option value={3}>3 Monate</option>
          <option value={6}>6 Monate</option>
          <option value={12}>12 Monate</option>
        </select>
      </div>
      
      {isLoading ? (
        <div className="animate-pulse bg-gray-100 rounded-lg h-[400px]"></div>
      ) : chartData.length > 0 ? (
        <KontostandChart data={chartData} />
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Keine Daten verfügbar</p>
          <p className="text-sm text-gray-400 mt-2">Bitte aktualisieren Sie den Kontostand in der Seitenleiste</p>
        </div>
      )}
    </div>
  );
} 