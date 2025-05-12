/**
 * Service for fetching and processing dashboard data
 * Combines data from multiple services to provide summary information
 */

import { loadBuchungen, enhanceTransactions } from './buchungen';
import { loadFixkosten, generateFixkostenProjections } from './fixkosten';
import { loadSimulationen, generateSimulationProjections } from './simulationen';
import { getUserSettings } from './user-settings';
import { Buchung, Fixkosten, Simulation } from '@/models/types';

export interface FinancialSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  upcomingPayments: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  hint?: string;
}

/**
 * Get complete dashboard data for a user
 */
export async function getDashboardData(userId: string | undefined) {
  try {
    // If no user ID, return mock data
    if (!userId) {
      return {
        summary: {
          currentBalance: 0,
          monthlyIncome: 0,
          monthlyExpenses: 0,
          upcomingPayments: 0
        },
        recentTransactions: [],
        upcomingPayments: []
      };
    }
    
    // Load all necessary data in parallel
    const [buchungen, fixkosten, simulationen, userSettings] = await Promise.all([
      loadBuchungen(userId),
      loadFixkosten(userId),
      loadSimulationen(userId),
      getUserSettings(userId)
    ]);
    
    // Calculate financial summary
    const summary = calculateFinancialSummary(
      buchungen, 
      fixkosten, 
      simulationen, 
      userSettings?.start_balance || 0
    );
    
    // Get recent transactions
    const recentTransactions = getRecentTransactions(buchungen, 4);
    
    // Get upcoming payments for the next 30 days
    const upcomingPayments = getUpcomingPayments(fixkosten, simulationen, 30);
    
    return {
      summary,
      recentTransactions,
      upcomingPayments
    };
  } catch (error) {
    // Return default data on error
    return {
      summary: {
        currentBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        upcomingPayments: 0
      },
      recentTransactions: [],
      upcomingPayments: []
    };
  }
}

/**
 * Calculate financial summary data
 */
function calculateFinancialSummary(
  buchungen: Buchung[],
  fixkosten: Fixkosten[],
  simulationen: Simulation[],
  startBalance: number
): FinancialSummary {
  // Get enhanced transactions with running balance
  const enhancedTransactions = enhanceTransactions(buchungen, startBalance);
  
  // Current balance is the last running balance
  const currentBalance = enhancedTransactions.length > 0 
    ? enhancedTransactions[enhancedTransactions.length - 1].kontostand || startBalance
    : startBalance;
  
  // Calculate monthly income and expenses from last 30 days
  const lastMonthDate = new Date();
  lastMonthDate.setDate(lastMonthDate.getDate() - 30);
  
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  
  // Process transactions from the last 30 days
  for (const tx of buchungen) {
    if (tx.date >= lastMonthDate) {
      if (tx.direction === 'Incoming') {
        monthlyIncome += tx.amount;
      } else {
        monthlyExpenses += tx.amount;
      }
    }
  }
  
  // Calculate upcoming payments for the next 30 days
  const upcomingPayments = getUpcomingPayments(fixkosten, simulationen, 30)
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  return {
    currentBalance,
    monthlyIncome,
    monthlyExpenses,
    upcomingPayments
  };
}

/**
 * Get list of recent transactions
 */
function getRecentTransactions(buchungen: Buchung[], limit: number = 5): Transaction[] {
  // Sort by date descending (newest first)
  const sorted = [...buchungen].sort((a, b) => 
    b.date.getTime() - a.date.getTime()
  );
  
  // Convert to dashboard transaction format
  return sorted.slice(0, limit).map(tx => ({
    id: tx.id,
    date: tx.date.toISOString().split('T')[0],
    description: tx.details,
    amount: tx.amount,
    category: tx.kategorie || 'Standard',
    type: tx.direction === 'Incoming' ? 'income' : 'expense',
    hint: tx.modified ? '✏️' : undefined
  }));
}

/**
 * Get upcoming payments from fixed costs and simulations
 */
function getUpcomingPayments(
  fixkosten: Fixkosten[], 
  simulationen: Simulation[], 
  daysAhead: number = 30
): Transaction[] {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + daysAhead);
  
  // Generate upcoming fixed costs
  const upcomingFixkosten = generateFixkostenProjections(fixkosten, today, endDate);
  
  // Generate upcoming simulations
  const upcomingSimulationen = generateSimulationProjections(simulationen, today, endDate);
  
  // Combine and convert to Transaction format
  const fixkostenTransactions = upcomingFixkosten.map((fx: Fixkosten & { date: Date }) => ({
    id: `fx-${fx.id}-${fx.date.getTime()}`,
    date: fx.date.toISOString().split('T')[0],
    description: fx.name,
    amount: fx.betrag,
    category: 'Fixkosten',
    type: 'expense' as const,
    hint: '📌'
  }));
  
  const simulationTransactions = upcomingSimulationen.map((sim: Simulation & { date: Date }) => ({
    id: `sim-${sim.id}-${sim.date.getTime()}`,
    date: sim.date.toISOString().split('T')[0],
    description: sim.name,
    amount: sim.amount,
    category: 'Simulation',
    type: sim.direction === 'Incoming' ? 'income' as const : 'expense' as const,
    hint: '🔮'
  }));
  
  // Combine and sort by date
  return [...fixkostenTransactions, ...simulationTransactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
} 