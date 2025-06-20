/**
 * Service for fetching and processing dashboard data
 * Combines data from multiple services to provide summary information
 */

import { loadBuchungen, enhanceTransactions } from './buchungen';
import { loadFixkosten, generateFixkostenProjections, calculateMonthlyCosts } from './fixkosten';
import { loadSimulationen, generateSimulationProjections, convertSimulationenToBuchungen } from './simulationen';
import { loadLohnkosten, generateLohnkostenProjections, calculateMonthlyLohnkosten } from './lohnkosten';
import { getUserSettings } from './user-settings';
import { Buchung, Fixkosten, Simulation, Mitarbeiter, MitarbeiterWithLohn, LohnDaten } from '@/models/types';
import { addMonths, format, eachMonthOfInterval, isWithinInterval, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

export interface FinancialSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  upcomingPayments: number;
  monthlyLohnkosten: number;
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

export interface CategorySummary {
  category: string;
  amount: number;
}

export interface PaymentAlert extends Transaction {
  daysUntilDue: number;
}

export interface MonthlyComparisonData {
  currentMonthName: string;
  previousMonthName: string;
  metrics: Array<{
    label: string;
    currentMonth: number;
    previousMonth: number;
    isHigherBetter: boolean;
  }>;
}

export interface CashFlowData {
  labels: string[];
  inflows: number[];
  outflows: number[];
  netFlow: number[];
}

export interface CashRunwayData {
  currentBalance: number;
  monthlyBurnRate: number;
  monthsOfRunway: number;
}

export interface DashboardData {
  summary: FinancialSummary;
  recentTransactions: Transaction[];
  upcomingPayments: PaymentAlert[];
  expenseCategories: CategorySummary[];
  monthlyComparison: MonthlyComparisonData;
  cashFlow: CashFlowData;
  cashRunway: CashRunwayData;
}

/**
 * Get complete dashboard data for a user
 */
export async function getDashboardData(userId: string | undefined): Promise<DashboardData> {
  try {
    // If no user ID, return mock data
    if (!userId) {
      return getEmptyDashboardData();
    }
    
    // Load all necessary data in parallel
    const [buchungen, fixkosten, simulationen, lohnkostenData, userSettings] = await Promise.all([
      loadBuchungen(userId),
      loadFixkosten(userId),
      loadSimulationen(userId),
      loadLohnkosten(userId),
      getUserSettings(userId)
    ]);
    
    const startBalance = userSettings?.start_balance || 0;
    
    // Calculate financial summary
    const summary = calculateFinancialSummary(
      buchungen, 
      fixkosten, 
      simulationen,
      lohnkostenData,
      startBalance
    );
    
    // Get recent transactions
    const recentTransactions = getRecentTransactions(buchungen, 4);
    
    // Get upcoming payments for the next 30 days with days until due
    const upcomingPayments = getUpcomingPaymentsWithAlerts(fixkosten, simulationen, lohnkostenData, 30);
    
    // Get expense breakdown by category
    const expenseCategories = getExpensesByCategory(buchungen);
    
    // Get monthly comparison data
    const monthlyComparison = getMonthlyComparison(buchungen);
    
    // Get cash flow data for the last 6 months
    const cashFlow = getCashFlowData(buchungen, 6);
    
    // Calculate cash runway (including salary costs in the burn rate)
    const cashRunway = calculateCashRunway(
      summary.currentBalance, 
      summary.monthlyExpenses + summary.monthlyLohnkosten
    );
    
    return {
      summary,
      recentTransactions,
      upcomingPayments,
      expenseCategories,
      monthlyComparison,
      cashFlow,
      cashRunway
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    // Return default data on error
    return getEmptyDashboardData();
  }
}

/**
 * Calculate financial summary data
 */
function calculateFinancialSummary(
  buchungen: Buchung[],
  fixkosten: Fixkosten[],
  simulationen: Simulation[],
  lohnkostenData: { mitarbeiter: MitarbeiterWithLohn; lohn: LohnDaten }[],
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
  
  // Calculate monthly salary costs
  const monthlyLohnkosten = calculateMonthlyLohnkosten(lohnkostenData);
  
  // Calculate upcoming payments for the next 30 days
  const upcomingPayments = getUpcomingPaymentsWithAlerts(fixkosten, simulationen, lohnkostenData, 30)
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  return {
    currentBalance,
    monthlyIncome,
    monthlyExpenses,
    upcomingPayments,
    monthlyLohnkosten
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
 * Get upcoming payments from fixed costs, simulations, and salary costs with days until due
 */
function getUpcomingPaymentsWithAlerts(
  fixkosten: Fixkosten[], 
  simulationen: Simulation[], 
  lohnkostenData: { mitarbeiter: MitarbeiterWithLohn; lohn: LohnDaten }[],
  daysAhead: number = 30
): PaymentAlert[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time component
  
  const endDate = new Date();
  endDate.setDate(today.getDate() + daysAhead);
  
  // Generate upcoming fixed costs
  const upcomingFixkosten = generateFixkostenProjections(fixkosten, today, endDate);
  
  // Generate upcoming simulations
  const upcomingSimulationen = generateSimulationProjections(simulationen, today, endDate);

  // Generate upcoming salary costs
  const upcomingLohnkosten = generateLohnkostenProjections(lohnkostenData, today, endDate);
  
  // Combine and convert to PaymentAlert format
  const fixkostenAlerts = upcomingFixkosten.map((fx: Fixkosten & { date: Date }) => ({
    id: `fx-${fx.id}-${fx.date.getTime()}`,
    date: fx.date.toISOString().split('T')[0],
    description: fx.name,
    amount: fx.betrag,
    category: fx.kategorie || 'Fixkosten',
    type: 'expense' as const,
    hint: '📌',
    daysUntilDue: differenceInDays(new Date(fx.date), today)
  }));
  
  const simulationAlerts = upcomingSimulationen.map((sim: Simulation & { date: Date }) => ({
    id: `sim-${sim.id}-${sim.date.getTime()}`,
    date: sim.date.toISOString().split('T')[0],
    description: sim.name,
    amount: sim.amount,
    category: 'Simulation',
    type: sim.direction === 'Incoming' ? 'income' as const : 'expense' as const,
    hint: '🔮',
    daysUntilDue: differenceInDays(new Date(sim.date), today)
  }));

  const lohnkostenAlerts = upcomingLohnkosten.map((lohn) => ({
    id: `lohn-${lohn.mitarbeiter.id}-${lohn.date.getTime()}`,
    date: lohn.date.toISOString().split('T')[0],
    description: `Lohn: ${lohn.mitarbeiter.Name}`,
    amount: lohn.lohn.Betrag,
    category: 'Lohn',
    type: 'expense' as const,
    hint: '💰',
    daysUntilDue: differenceInDays(new Date(lohn.date), today)
  }));
  
  // Combine and sort by days until due (ascending)
  return [...fixkostenAlerts, ...simulationAlerts, ...lohnkostenAlerts]
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Calculate expense breakdown by category
 */
function getExpensesByCategory(buchungen: Buchung[]): CategorySummary[] {
  const lastMonthDate = new Date();
  lastMonthDate.setDate(lastMonthDate.getDate() - 30);
  
  // Filter to expenses only from the last 30 days
  const recentExpenses = buchungen.filter(tx => 
    tx.direction === 'Outgoing' && tx.date >= lastMonthDate
  );
  
  // Group by category
  const categoryMap: Record<string, number> = {};
  
  recentExpenses.forEach(tx => {
    const category = tx.kategorie || 'Standard';
    if (!categoryMap[category]) {
      categoryMap[category] = 0;
    }
    categoryMap[category] += tx.amount;
  });
  
  // Convert to array format
  return Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount
  }));
}

/**
 * Get monthly comparison data
 */
function getMonthlyComparison(buchungen: Buchung[]): MonthlyComparisonData {
  const today = new Date();
  
  // Current month
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Previous month
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  
  // Format month names
  const currentMonthName = format(currentMonthStart, 'MMMM yyyy', { locale: de });
  const previousMonthName = format(previousMonthStart, 'MMMM yyyy', { locale: de });
  
  // Calculate metrics for current month
  const currentMonthTxs = buchungen.filter(tx => 
    tx.date >= currentMonthStart && tx.date <= currentMonthEnd
  );
  
  const currentMonthIncome = currentMonthTxs
    .filter(tx => tx.direction === 'Incoming')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const currentMonthExpenses = currentMonthTxs
    .filter(tx => tx.direction === 'Outgoing')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const currentMonthNet = currentMonthIncome - currentMonthExpenses;
  
  // Calculate metrics for previous month
  const previousMonthTxs = buchungen.filter(tx => 
    tx.date >= previousMonthStart && tx.date <= previousMonthEnd
  );
  
  const previousMonthIncome = previousMonthTxs
    .filter(tx => tx.direction === 'Incoming')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const previousMonthExpenses = previousMonthTxs
    .filter(tx => tx.direction === 'Outgoing')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const previousMonthNet = previousMonthIncome - previousMonthExpenses;
  
  // Prepare the comparison data
  return {
    currentMonthName,
    previousMonthName,
    metrics: [
      {
        label: 'Einnahmen',
        currentMonth: currentMonthIncome,
        previousMonth: previousMonthIncome,
        isHigherBetter: true
      },
      {
        label: 'Ausgaben',
        currentMonth: currentMonthExpenses,
        previousMonth: previousMonthExpenses,
        isHigherBetter: false
      },
      {
        label: 'Nettoumsatz',
        currentMonth: currentMonthNet,
        previousMonth: previousMonthNet,
        isHigherBetter: true
      }
    ]
  };
}

/**
 * Calculate cash flow data for the last N months
 */
function getCashFlowData(buchungen: Buchung[], monthCount: number = 6): CashFlowData {
  const today = new Date();
  const startDate = addMonths(today, -monthCount + 1);
  startDate.setDate(1); // Start from the first day of the month
  
  // Get all months in the range
  const monthRange = eachMonthOfInterval({
    start: startDate,
    end: today
  });
  
  // Initialize data arrays
  const labels: string[] = [];
  const inflows: number[] = [];
  const outflows: number[] = [];
  const netFlow: number[] = [];
  
  // Process each month
  monthRange.forEach(month => {
    // Format month label
    labels.push(format(month, 'MMM yy', { locale: de }));
    
    // Calculate total inflows and outflows for this month
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthTxs = buchungen.filter(tx => 
      isWithinInterval(tx.date, { start: monthStart, end: monthEnd })
    );
    
    const monthInflow = monthTxs
      .filter(tx => tx.direction === 'Incoming')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const monthOutflow = monthTxs
      .filter(tx => tx.direction === 'Outgoing')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const monthNet = monthInflow - monthOutflow;
    
    // Add to data arrays
    inflows.push(monthInflow);
    outflows.push(monthOutflow);
    netFlow.push(monthNet);
  });
  
  return { labels, inflows, outflows, netFlow };
}

/**
 * Calculate cash runway based on current balance and monthly expenses
 */
function calculateCashRunway(currentBalance: number, monthlyExpenses: number): CashRunwayData {
  // If monthly expenses are 0 or very small, runway is effectively infinite
  const burnRate = monthlyExpenses > 0 ? monthlyExpenses : 1;
  
  // Calculate how many months the current balance will last
  const monthsOfRunway = monthlyExpenses > 0 
    ? Math.max(0, currentBalance / monthlyExpenses)
    : Infinity;
  
  return {
    currentBalance,
    monthlyBurnRate: burnRate,
    monthsOfRunway
  };
}

/**
 * Return empty dashboard data structure for initialization
 */
function getEmptyDashboardData(): DashboardData {
  const today = new Date();
  const currentMonthName = format(today, 'MMMM yyyy', { locale: de });
  const previousMonthName = format(addMonths(today, -1), 'MMMM yyyy', { locale: de });
  
  return {
    summary: {
      currentBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      upcomingPayments: 0,
      monthlyLohnkosten: 0
    },
    recentTransactions: [],
    upcomingPayments: [],
    expenseCategories: [],
    monthlyComparison: {
      currentMonthName,
      previousMonthName,
      metrics: [
        { label: 'Einnahmen', currentMonth: 0, previousMonth: 0, isHigherBetter: true },
        { label: 'Ausgaben', currentMonth: 0, previousMonth: 0, isHigherBetter: false },
        { label: 'Nettoumsatz', currentMonth: 0, previousMonth: 0, isHigherBetter: true }
      ]
    },
    cashFlow: {
      labels: [],
      inflows: [],
      outflows: [],
      netFlow: []
    },
    cashRunway: {
      currentBalance: 0,
      monthlyBurnRate: 0,
      monthsOfRunway: 0
    }
  };
} 