'use client';

import { useEffect, useState } from 'react';
import { useAuth } from "@/components/auth/AuthProvider";
import { formatCHF } from "@/lib/currency";
import Link from "next/link";
import { getDashboardData, DashboardData } from "@/lib/services/dashboard";

// Import our new components
import CashFlowChart from '@/app/components/chart/CashFlowChart';
import ExpensePieChart from '@/app/components/chart/ExpensePieChart';
import PaymentDueAlerts from '@/app/components/dashboard/PaymentDueAlerts';
import MonthlyComparison from '@/app/components/dashboard/MonthlyComparison';
import QuickActions from '@/app/components/dashboard/QuickActions';
import CashRunwayIndicator from '@/app/components/dashboard/CashRunwayIndicator';

// Import icons
import {
  PlanningIcon,
  TransactionIcon,
  FixkostenIcon,
  MitarbeiterIcon,
  SimulationIcon,
  AddTransactionIcon
} from '@/app/components/dashboard/DashboardIcons';

export default function Dashboard() {
  const { authState } = useAuth();
  const { user, isAdmin } = authState;
  
  // State for dashboard data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    // Get user ID safely
    const userId = user?.id;
    
    // Only fetch data if user is logged in
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        
        const data = await getDashboardData(userId);
        setDashboardData(data);
        
      } catch (err) {
        setError('Fehler beim Laden der Dashboard-Daten. Bitte versuchen Sie es später erneut.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [user?.id]);

  // Define Quick Actions
  const quickActions = [
    {
      label: 'Neue Buchung',
      href: '/planung?action=add',
      icon: <AddTransactionIcon />,
      accent: true
    },
    {
      label: 'Planung',
      href: '/planung',
      icon: <PlanningIcon />,
      accent: false
    },
    {
      label: 'Fixkosten',
      href: '/fixkosten',
      icon: <FixkostenIcon />,
      accent: false
    },
    {
      label: 'Mitarbeiter',
      href: '/mitarbeiter',
      icon: <MitarbeiterIcon />,
      accent: false
    }
  ];

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="flex space-x-3">
            <div className="h-10 bg-gray-200 rounded w-24"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        
        {/* Skeleton for cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
        
        <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-64 bg-gray-100 rounded w-full"></div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Fehler</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Neu laden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Return null if dashboard data is not loaded yet
  if (!dashboardData) {
    return null;
  }

  const { 
    summary, 
    recentTransactions, 
    upcomingPayments, 
    expenseCategories, 
    monthlyComparison,
    cashFlow,
    cashRunway
  } = dashboardData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex space-x-3">
          <Link 
            href="/planung" 
            className="bg-vaios-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-vaios-700"
          >
            Zur Planung
          </Link>
          <Link 
            href="/datenimport" 
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
          >
            Daten importieren
          </Link>
        </div>
      </div>
      
      {/* Financial summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm text-gray-500 font-medium">Aktueller Kontostand</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatCHF(summary.currentBalance)}
          </p>
          <div className="mt-2 text-xs text-green-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
            </svg>
            <span>Aktueller Stand</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm text-gray-500 font-medium">Monatliche Einnahmen</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatCHF(summary.monthlyIncome)}
          </p>
          <div className="mt-2 text-xs text-green-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
            </svg>
            <span>Letzte 30 Tage</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm text-gray-500 font-medium">Monatliche Ausgaben</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatCHF(summary.monthlyExpenses)}
          </p>
          <div className="mt-2 text-xs text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
            <span>Letzte 30 Tage</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm text-gray-500 font-medium">Anstehende Zahlungen</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatCHF(summary.upcomingPayments)}
          </p>
          <div className="mt-2 text-xs text-gray-600">
            Fällig in den nächsten 30 Tagen
          </div>
        </div>
      </div>
      
      {/* Cash Flow Chart */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-2">Cash Flow Übersicht</h2>
        <CashFlowChart
          labels={cashFlow.labels}
          inflows={cashFlow.inflows}
          outflows={cashFlow.outflows}
          netFlow={cashFlow.netFlow}
        />
      </div>
      
      {/* Main content - 3 column grid for desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Expense categories & Monthly comparison */}
        <div className="space-y-6">
          {/* Expense Categories */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-2">Ausgaben nach Kategorie</h2>
            {expenseCategories.length > 0 ? (
              <ExpensePieChart data={expenseCategories} />
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p>Keine Ausgaben vorhanden</p>
                <p className="text-sm mt-2">Erstellen Sie Buchungen, um Kategorien anzuzeigen</p>
              </div>
            )}
          </div>
          
          {/* Monthly Comparison */}
          <MonthlyComparison
            currentMonthName={monthlyComparison.currentMonthName}
            previousMonthName={monthlyComparison.previousMonthName}
            metrics={monthlyComparison.metrics}
          />
        </div>
        
        {/* Middle column - Recent transactions */}
        <div className="space-y-6">
          {/* Recent transactions */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Letzte Transaktionen</h2>
              <Link href="/planung" className="text-sm text-vaios-primary hover:text-vaios-600">
                Alle anzeigen →
              </Link>
            </div>
            
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>Keine Transaktionen vorhanden</p>
                <p className="text-sm mt-2">Erstellen Sie Buchungen, um sie hier anzuzeigen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center">
                        {transaction.hint && <span className="mr-2">{transaction.hint}</span>}
                        <p className="font-medium text-gray-800">
                          {transaction.description}
                        </p>
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white bg-opacity-70 text-gray-600">
                          {transaction.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(transaction.date).toLocaleDateString('de-CH')}
                      </p>
                    </div>
                    <div className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCHF(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Cash Runway Indicator */}
          <CashRunwayIndicator
            currentBalance={cashRunway.currentBalance}
            monthlyBurnRate={cashRunway.monthlyBurnRate}
            monthsOfRunway={cashRunway.monthsOfRunway}
          />
        </div>
        
        {/* Right column - Payment alerts & Quick actions & User info */}
        <div className="space-y-6">
          {/* User welcome card */}
          {user && (
            <div className="bg-vaios-50 p-5 rounded-xl border border-vaios-200">
              <h2 className="text-lg font-semibold text-vaios-primary mb-2">Willkommen zurück!</h2>
              <p className="text-sm text-gray-700 mb-3">
                Angemeldet als: <span className="font-semibold">{user.email}</span>
              </p>
              {isAdmin && (
                <div className="bg-vaios-100 text-vaios-primary text-xs font-medium px-2.5 py-1 rounded inline-block">
                  Administrator
                </div>
              )}
            </div>
          )}
          
          {/* Payment Due Alerts component */}
          <PaymentDueAlerts payments={upcomingPayments} limit={4} />
          
          {/* Quick Actions component */}
          <QuickActions actions={quickActions} />
        </div>
      </div>
    </div>
  );
} 