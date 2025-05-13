'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import { loadBuchungen, enhanceTransactions, filterTransactions } from "@/lib/services/buchungen";
import { loadFixkosten, convertFixkostenToBuchungen } from "@/lib/services/fixkosten";
import { loadSimulationen, convertSimulationenToBuchungen } from "@/lib/services/simulationen";
import { convertLohneToBuchungen, loadMitarbeiter } from "@/lib/services/mitarbeiter";
import { getUserSettings } from "@/lib/services/user-settings";
import { EnhancedTransaction, TransactionCategory } from "@/models/types";
import { formatCHF } from "@/lib/currency";
import { format, addMonths, addQuarters, addYears } from "date-fns";
import { de } from "date-fns/locale";
import LiquidityChart from "@/components/chart/LiquidityChart";
import PlanungSummary from "@/components/summary/PlanungSummary";

export default function Planung() {
  const { authState } = useAuth();
  const { user } = authState;
  const [activeTab, setActiveTab] = useState('monthly');
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'summary'>('summary');
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('month');
  
  // State for transactions and filters
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<EnhancedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
  });
  
  const [endDate, setEndDate] = useState<Date>(() => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setMonth(now.getMonth() + 3); // 3 months ahead
    return futureDate;
  });
  
  const [showFixkosten, setShowFixkosten] = useState(true);
  const [showSimulationen, setShowSimulationen] = useState(true);
  const [showLoehne, setShowLoehne] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(25000);
  const [sortOption, setSortOption] = useState('date-asc');
  
  // State for export dialog
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('management-summary');
  const [exportTitle, setExportTitle] = useState('Liquiditätsplanung');
  const [isExporting, setIsExporting] = useState(false);
  
  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Load user settings for starting balance
        const settings = await getUserSettings(user.id);
        const startBalance = settings.start_balance;
        
        // Load transactions, fixed costs, simulations, and employees
        const [buchungen, fixkosten, simulationen, mitarbeiter] = await Promise.all([
          loadBuchungen(user.id),
          loadFixkosten(user.id),
          loadSimulationen(user.id),
          loadMitarbeiter(user.id)
        ]);
        
        // Convert fixed costs, simulations, and salaries to transactions
        let allTransactions = [...buchungen];
        
        if (showFixkosten) {
          const fixkostenBuchungen = convertFixkostenToBuchungen(startDate, endDate, fixkosten);
          allTransactions = [...allTransactions, ...fixkostenBuchungen];
        }
        
        if (showSimulationen) {
          const simulationBuchungen = convertSimulationenToBuchungen(startDate, endDate, simulationen);
          allTransactions = [...allTransactions, ...simulationBuchungen];
        }
        
        if (showLoehne) {
          const lohnBuchungen = convertLohneToBuchungen(startDate, endDate, mitarbeiter);
          allTransactions = [...allTransactions, ...lohnBuchungen];
        }
        
        // Enhance transactions with running balance
        const enhancedTx = enhanceTransactions(allTransactions, startBalance);
        setTransactions(enhancedTx);
        
        // Apply filters
        applyFilters(enhancedTx);
      } catch (err) {
        setError('Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.');
        setTransactions([]);
        setFilteredTransactions([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [user?.id, startDate, endDate, showFixkosten, showSimulationen, showLoehne]);
  
  // Apply filters when filter criteria change
  useEffect(() => {
    applyFilters(transactions);
  }, [searchText, minAmount, maxAmount, sortOption]);
  
  // Filter function
  const applyFilters = (allTransactions: EnhancedTransaction[]) => {
    // Apply text search, amount filters
    let filtered = filterTransactions(
      allTransactions,
      startDate,
      endDate,
      {
        searchText,
        minAmount,
        maxAmount
      }
    );
    
    // Apply sorting
    switch (sortOption) {
      case 'date-asc':
        filtered = [...filtered].sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
      case 'date-desc':
        filtered = [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime());
        break;
      case 'amount-asc':
        filtered = [...filtered].sort((a, b) => a.amount - b.amount);
        break;
      case 'amount-desc':
        filtered = [...filtered].sort((a, b) => b.amount - a.amount);
        break;
    }
    
    setFilteredTransactions(filtered);
  };
  
  // Tab period selection
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    switch (tab) {
      case 'monthly':
        // Current month + 3 months
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = addMonths(start, 3);
        break;
      case 'quarterly':
        // Current quarter + 3 quarters (9 months)
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        end = addQuarters(start, 3);
        break;
      case 'yearly':
        // Current year + next year
        start = new Date(now.getFullYear(), 0, 1);
        end = addYears(start, 1);
        end.setMonth(11);
        end.setDate(31);
        break;
    }
    
    setStartDate(start);
    setEndDate(end);
  };
  
  // View mode selection
  const handleViewModeChange = (mode: 'table' | 'chart' | 'summary') => {
    setViewMode(mode);
  };
  
  // Handle chart period change
  const handleChartPeriodChange = (period: 'day' | 'week' | 'month') => {
    setChartPeriod(period);
  };
  
  // Handle export action
  const handleExport = async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      
      const response = await fetch('/api/export/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          includeFixkosten: showFixkosten,
          includeSimulationen: showSimulationen,
          includeLoehne: showLoehne,
          format: exportFormat,
          title: exportTitle,
          subtitle: `Transaktionen ${format(startDate, 'dd.MM.yyyy', { locale: de })} - ${format(endDate, 'dd.MM.yyyy', { locale: de })}`
        }),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get the response data
      const contentType = response.headers.get('Content-Type');
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Set filename based on format
      let filename;
      switch (exportFormat) {
        case 'csv':
          filename = `vai-liquiditätsplanung-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        case 'pdf':
          filename = `vai-liquiditätsplanung-${format(new Date(), 'yyyy-MM-dd')}.html`;
          break;
        case 'management-summary':
          filename = `vai-management-summary-${format(new Date(), 'yyyy-MM-dd')}.html`;
          break;
        default:
          filename = `vai-export-${format(new Date(), 'yyyy-MM-dd')}`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Fehler beim Export. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-vaios-primary">Liquiditätsplanung</h1>
        
        {/* Export button */}
        <button
          onClick={() => setShowExportModal(true)}
          className="btn-vaios-primary flex items-center"
          disabled={isLoading || filteredTransactions.length === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Management-Bericht
        </button>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex justify-between border-b">
          <div className="flex">
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'monthly' ? 'text-vaios-primary border-b-2 border-vaios-primary' : 'text-gray-600'}`}
              onClick={() => handleTabChange('monthly')}
            >
              3 Monate
            </button>
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'quarterly' ? 'text-vaios-primary border-b-2 border-vaios-primary' : 'text-gray-600'}`}
              onClick={() => handleTabChange('quarterly')}
            >
              9 Monate
            </button>
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'yearly' ? 'text-vaios-primary border-b-2 border-vaios-primary' : 'text-gray-600'}`}
              onClick={() => handleTabChange('yearly')}
            >
              1 Jahr
            </button>
          </div>
          
          {/* View mode toggle */}
          <div className="flex pr-2">
            <button
              className={`px-4 py-3 flex items-center ${viewMode === 'summary' ? 'text-vaios-primary' : 'text-gray-600'}`}
              onClick={() => handleViewModeChange('summary')}
              title="Übersicht"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <button
              className={`px-4 py-3 flex items-center ${viewMode === 'chart' ? 'text-vaios-primary' : 'text-gray-600'}`}
              onClick={() => handleViewModeChange('chart')}
              title="Grafik"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </button>
            <button
              className={`px-4 py-3 flex items-center ${viewMode === 'table' ? 'text-vaios-primary' : 'text-gray-600'}`}
              onClick={() => handleViewModeChange('table')}
              title="Tabelle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
              <input 
                type="date" 
                value={startDate.toISOString().split('T')[0]} 
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
              <input 
                type="date" 
                value={endDate.toISOString().split('T')[0]} 
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suche</label>
              <input 
                type="text" 
                value={searchText} 
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Beschreibung..."
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sortieren</label>
              <select 
                value={sortOption} 
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="date-asc">Datum (aufsteigend)</option>
                <option value="date-desc">Datum (absteigend)</option>
                <option value="amount-asc">Betrag (aufsteigend)</option>
                <option value="amount-desc">Betrag (absteigend)</option>
              </select>
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="inline-flex items-center">
              <input 
                type="checkbox" 
                checked={showFixkosten} 
                onChange={(e) => setShowFixkosten(e.target.checked)}
                className="form-checkbox h-5 w-5 text-vaios-primary"
              />
              <span className="ml-2 text-sm text-gray-700">Fixkosten 📌</span>
            </label>
            <label className="inline-flex items-center">
              <input 
                type="checkbox" 
                checked={showSimulationen} 
                onChange={(e) => setShowSimulationen(e.target.checked)}
                className="form-checkbox h-5 w-5 text-vaios-primary"
              />
              <span className="ml-2 text-sm text-gray-700">Simulationen 🔮</span>
            </label>
            <label className="inline-flex items-center">
              <input 
                type="checkbox" 
                checked={showLoehne} 
                onChange={(e) => setShowLoehne(e.target.checked)}
                className="form-checkbox h-5 w-5 text-vaios-primary"
              />
              <span className="ml-2 text-sm text-gray-700">Lohnauszahlungen 💰</span>
            </label>
          </div>
        </div>
        
        {/* Content area */}
        <div className="p-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500">Daten werden geladen...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-gray-700">{error}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Keine Transaktionen im ausgewählten Zeitraum gefunden.</p>
            </div>
          ) : (
            <>
              {/* Summary View */}
              {viewMode === 'summary' && (
                <PlanungSummary 
                  transactions={filteredTransactions} 
                  startDate={startDate} 
                  endDate={endDate} 
                />
              )}
              
              {/* Chart View */}
              {viewMode === 'chart' && (
                <div>
                  <div className="flex justify-end mb-2">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                      <button
                        type="button"
                        onClick={() => handleChartPeriodChange('day')}
                        className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${
                          chartPeriod === 'day'
                            ? 'bg-vaios-primary text-white border-vaios-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Tag
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChartPeriodChange('week')}
                        className={`px-4 py-2 text-sm font-medium border-t border-b ${
                          chartPeriod === 'week'
                            ? 'bg-vaios-primary text-white border-vaios-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Woche
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChartPeriodChange('month')}
                        className={`px-4 py-2 text-sm font-medium border rounded-r-lg ${
                          chartPeriod === 'month'
                            ? 'bg-vaios-primary text-white border-vaios-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Monat
                      </button>
                    </div>
                  </div>
                  <LiquidityChart 
                    transactions={filteredTransactions}
                    startDate={startDate}
                    endDate={endDate}
                    aggregationPeriod={chartPeriod}
                  />
                </div>
              )}
              
              {/* Table View */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Datum
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Beschreibung
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategorie
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Betrag
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kontostand
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.map((transaction) => {
                        const isIncome = transaction.direction === 'Incoming';
                        const amountClass = isIncome ? 'text-green-600' : 'text-red-600';
                        
                        return (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(transaction.date, 'dd.MM.yyyy', { locale: de })}
                              {transaction.shifted && (
                                <span className="ml-1 inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20" 
                                      title="Ursprünglicher Termin ist überfällig - auf morgen verschoben">
                                  verschoben
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {transaction.hinweis && <span className="mr-1">{transaction.hinweis}</span>}
                              {transaction.details}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.kategorie}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${amountClass}`}>
                              {isIncome ? '+' : '-'}{formatCHF(Math.abs(transaction.amount))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                              {formatCHF(transaction.kontostand || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Summary Footer */}
        {!isLoading && !error && filteredTransactions.length > 0 && viewMode === 'table' && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between">
              <div>
                <span className="text-sm font-medium text-gray-500">Gesamt: </span>
                <span className="text-sm font-medium">{filteredTransactions.length} Transaktionen</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Endsaldo: </span>
                <span className="text-sm font-medium">
                  {formatCHF(filteredTransactions[filteredTransactions.length - 1]?.kontostand || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-vaios-primary">Management-Bericht exportieren</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="management-summary">Management-Summary (HTML)</option>
                <option value="pdf">Detaillierter Bericht (PDF)</option>
                <option value="csv">Excel-Tabelle (CSV)</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
              <input
                type="text"
                value={exportTitle}
                onChange={(e) => setExportTitle(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Liquiditätsplanung"
              />
            </div>
            
            <div className="border-t pt-4 mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 bg-vaios-primary text-white rounded flex items-center"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exportieren...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportieren
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 