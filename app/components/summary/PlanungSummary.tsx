import React, { useMemo } from 'react';
import { EnhancedTransaction } from '@/models/types';
import { formatCHF } from '@/lib/currency';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PlanungSummaryProps {
  transactions: EnhancedTransaction[];
  startDate: Date;
  endDate: Date;
}

export default function PlanungSummary({ transactions, startDate, endDate }: PlanungSummaryProps) {
  const metrics = useMemo(() => {
    if (transactions.length === 0) {
      return {
        startBalance: 0,
        endBalance: 0,
        netChange: 0,
        netChangePercent: '0',
        totalIncome: 0,
        totalExpenses: 0,
        cashFlow: 0,
        transactionCount: 0,
        incomeCount: 0,
        expenseCount: 0,
        categorySummary: []
      };
    }

    // Sort transactions by date to ensure correct ordering
    const sortedTransactions = [...transactions].sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );

    // Get starting and ending balances
    const startBalance = sortedTransactions[0]?.kontostand || 0;
    const endBalance = sortedTransactions[sortedTransactions.length - 1]?.kontostand || 0;
    const netChange = endBalance - startBalance;
    const netChangePercent = startBalance !== 0 
      ? ((netChange / Math.abs(startBalance)) * 100).toFixed(1) 
      : 'N/A';

    // Calculate income and expenses
    let totalIncome = 0;
    let totalExpenses = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    
    // Track category summaries
    const categoryMap: Record<string, { count: number, amount: number }> = {};

    sortedTransactions.forEach(tx => {
      if (tx.direction === 'Incoming') {
        totalIncome += tx.amount;
        incomeCount++;
      } else {
        totalExpenses += tx.amount;
        expenseCount++;
      }

      // Update category statistics
      const category = tx.kategorie;
      if (!categoryMap[category]) {
        categoryMap[category] = { count: 0, amount: 0 };
      }
      
      categoryMap[category].count += 1;
      categoryMap[category].amount += tx.direction === 'Incoming' ? tx.amount : -tx.amount;
    });

    // Calculate total cash flow (income - expenses)
    const cashFlow = totalIncome - totalExpenses;

    // Prepare category summary for display
    const categorySummary = Object.entries(categoryMap)
      .sort((a, b) => Math.abs(b[1].amount) - Math.abs(a[1].amount))
      .slice(0, 5) // Top 5 categories
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount
      }));

    return {
      startBalance,
      endBalance,
      netChange,
      netChangePercent,
      totalIncome,
      totalExpenses,
      cashFlow,
      transactionCount: sortedTransactions.length,
      incomeCount,
      expenseCount,
      categorySummary
    };
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Keine Transaktionen im ausgewählten Zeitraum</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Key Financial Metrics */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-vaios-primary mb-3">Finanzübersicht</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Anfangssaldo:</span>
            <span className="font-medium">{formatCHF(metrics.startBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Endsaldo:</span>
            <span className="font-medium">{formatCHF(metrics.endBalance)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-gray-600">Veränderung:</span>
            <span className={`font-medium ${metrics.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.netChange >= 0 ? '+' : ''}{formatCHF(metrics.netChange)}
              <span className="text-xs ml-1">({metrics.netChangePercent}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Income & Expenses */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-vaios-primary mb-3">Einnahmen & Ausgaben</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Einnahmen:</span>
            <span className="font-medium text-green-600">{formatCHF(metrics.totalIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ausgaben:</span>
            <span className="font-medium text-red-600">{formatCHF(metrics.totalExpenses)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-gray-600">Cashflow:</span>
            <span className={`font-medium ${metrics.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.cashFlow >= 0 ? '+' : ''}{formatCHF(metrics.cashFlow)}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction Statistics */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-vaios-primary mb-3">Transaktionsstatistik</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Anzahl Transaktionen:</span>
            <span className="font-medium">{metrics.transactionCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Einnahmen:</span>
            <span className="font-medium text-green-600">{metrics.incomeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ausgaben:</span>
            <span className="font-medium text-red-600">{metrics.expenseCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Zeitraum:</span>
            <span className="font-medium">
              {format(startDate, 'dd.MM.yyyy', { locale: de })} - {format(endDate, 'dd.MM.yyyy', { locale: de })}
            </span>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {metrics.categorySummary.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 lg:col-span-3">
          <h3 className="text-lg font-semibold text-vaios-primary mb-3">Top Kategorien</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b">
                  <th className="pb-2">Kategorie</th>
                  <th className="pb-2">Anzahl</th>
                  <th className="pb-2 text-right">Summe</th>
                </tr>
              </thead>
              <tbody>
                {metrics.categorySummary.map((category, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2">{category.name}</td>
                    <td className="py-2">{category.count}</td>
                    <td className={`py-2 text-right ${category.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {category.amount >= 0 ? '+' : ''}{formatCHF(category.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 