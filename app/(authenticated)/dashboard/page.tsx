'use client';

import { KontostandChart } from '@/app/components/chart/KontostandChart';
import { getBalanceHistory, getCurrentBalance } from '@/lib/services/daily-balance';
import { DailyBalanceSnapshot, Simulation } from '@/models/types';
import { useState, useEffect } from 'react';
import { addMonths, subMonths, startOfDay } from 'date-fns';
import { loadSimulationen } from '@/lib/services/simulationen';
import { getSignedAmount } from '@/lib/currency/format';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState(3); // Default 3 months
  const [chartData, setChartData] = useState<{ date: string; balance: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        
        // Get balance history
        const balances = await getBalanceHistory(startDate, endDate);
        console.log('Loaded balances:', balances);
        
        // Get all simulations
        const simulations = await loadSimulationen();
        console.log('Loaded simulations:', simulations);
        
        // Create a map of dates to balances
        const balanceMap = new Map<string, number>();
        
        // Initialize with actual balances
        balances.forEach(balance => {
          const dateStr = balance.date.toISOString().split('T')[0];
          balanceMap.set(dateStr, balance.balance);
        });
        
        // If we have no historical data, at least add the current balance
        if (balanceMap.size === 0) {
          const todayStr = today.toISOString().split('T')[0];
          balanceMap.set(todayStr, currentBalance.balance);
        }
        
        // Add simulation impacts
        simulations.forEach((simulation: Simulation) => {
          const simulationDate = new Date(simulation.date);
          if (simulationDate >= startDate && simulationDate <= endDate) {
            const dateStr = simulationDate.toISOString().split('T')[0];
            const currentBalanceValue = balanceMap.get(dateStr) || currentBalance.balance;
            const signedAmount = getSignedAmount(simulation.amount, simulation.direction);
            balanceMap.set(dateStr, currentBalanceValue + signedAmount);
            
            // If recurring, add future occurrences
            if (simulation.recurring && simulation.interval) {
              let nextDate = simulationDate;
              let lastBalance = currentBalanceValue + signedAmount;
              
              while (nextDate <= endDate) {
                if (simulation.interval === 'monthly') {
                  nextDate = addMonths(nextDate, 1);
                } else if (simulation.interval === 'quarterly') {
                  nextDate = addMonths(nextDate, 3);
                } else if (simulation.interval === 'yearly') {
                  nextDate = addMonths(nextDate, 12);
                }
                
                if (nextDate <= endDate && (!simulation.end_date || nextDate <= new Date(simulation.end_date))) {
                  const nextDateStr = nextDate.toISOString().split('T')[0];
                  const nextBalance = balanceMap.get(nextDateStr) || lastBalance;
                  const newBalance = nextBalance + signedAmount;
                  balanceMap.set(nextDateStr, newBalance);
                  lastBalance = newBalance;
                }
              }
            }
          }
        });
        
        // Convert map to sorted array
        const sortedData = Array.from(balanceMap.entries())
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .map(([date, balance]) => ({ date, balance }));
        
        console.log('Final chart data:', sortedData);
        
        setChartData(sortedData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [timeRange]);

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