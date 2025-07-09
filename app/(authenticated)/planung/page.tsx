'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import { loadBuchungen, enhanceTransactions, filterTransactions } from "@/lib/services/buchungen";
import { loadFixkosten, convertFixkostenToBuchungen } from "@/lib/services/fixkosten";
import { loadMitarbeiter } from "@/lib/services/mitarbeiter";
import { loadLohnkosten, convertLohnkostenToBuchungen } from "@/lib/services/lohnkosten";
import { getUserSettings } from "@/lib/services/user-settings";
import { EnhancedTransaction } from "@/models/types";
import { formatCHF } from "@/lib/currency";
import { format, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import { useNotification } from "@/components/ui/Notification";
import { loadFixkostenOverrides } from "@/lib/services/fixkosten-overrides";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default function Planung() {
  const { authState } = useAuth();
  const { user } = authState;
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('monthly');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EnhancedTransaction | null>(null);
  
  // State for transactions and filters
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<EnhancedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  
  const [endDate, setEndDate] = useState<Date>(() => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setMonth(now.getMonth() + 3);
    return futureDate;
  });
  
  const [showFixkosten, setShowFixkosten] = useState(true);
  const [showLoehne, setShowLoehne] = useState(true);
  const [showStandard, setShowStandard] = useState(true);
  const [showManual, setShowManual] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [sortOption, setSortOption] = useState('date-asc');
  
  // Add simulation state
  const [showSimulations, setShowSimulations] = useState(true);

  // Fetch all data
  const fetchData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load user settings for starting balance
      const settings = await getUserSettings(user.id);
      const startBalance = settings.start_balance;
      
      // Load transactions, fixed costs, employees, and overrides
      const [buchungen, fixkosten, lohnkostenData, overridesData] = await Promise.all([
        loadBuchungen(user.id),
        loadFixkosten(user.id),
        loadLohnkosten(user.id),
        loadFixkostenOverrides(user.id)
      ]);
      
      // Convert fixed costs and salaries to transactions
      let allTransactions = [...buchungen];
      
      // Always load all transactions, filtering happens in applyFilters
      const fixkostenBuchungen = convertFixkostenToBuchungen(startDate, endDate, fixkosten, overridesData);
      const lohnBuchungen = convertLohnkostenToBuchungen(startDate, endDate, lohnkostenData.map(item => item.mitarbeiter));
      
      allTransactions = [
        ...allTransactions,
        ...fixkostenBuchungen,
        ...lohnBuchungen
      ];
      
      // Enhance transactions with running balance
      const enhancedTx = await enhanceTransactions(allTransactions);
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
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, startDate, endDate]);
  
  // Apply filters when filter criteria change
  useEffect(() => {
    applyFilters(transactions);
  }, [searchText, sortOption, showFixkosten, showLoehne, showStandard, showManual, showSimulations]);
  
  // Filter function
  const applyFilters = (allTransactions: EnhancedTransaction[]) => {
    // First filter by transaction type
    let filtered = allTransactions.filter(tx => {
      if (tx.kategorie?.toLowerCase() === 'fixkosten') return showFixkosten;
      if (tx.kategorie?.toLowerCase() === 'lohn') return showLoehne;
      if (tx.kategorie?.toLowerCase() === 'simulation') return showSimulations;
      if (tx.modified) return showManual; // Filter manual transactions
      return showStandard; // All other categories are considered Standard
    });

    // Then apply other filters
    filtered = filterTransactions(
      filtered,
      startDate,
      endDate,
      {
        searchText,
        minAmount: 0,
        maxAmount: Number.MAX_VALUE
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
        end = addMonths(start, 9);
        break;
      case 'yearly':
        // Current year + next year
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 11, 31);
        break;
    }
    
    setStartDate(start);
    setEndDate(end);
  };
  
  const handleEditTransaction = (transaction: EnhancedTransaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = async (transaction: EnhancedTransaction) => {
    if (!user?.id || !transaction.id) return;

    try {
      const { error } = await supabase
        .from('buchungen')
        .delete()
        .eq('id', transaction.id)
        .eq('user_id', user.id)
        .eq('modified', true); // Only delete manual transactions

      if (error) {
        throw error;
      }

      showNotification(
        'Transaktion wurde erfolgreich gelöscht',
        'success'
      );
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showNotification(
        'Transaktion konnte nicht gelöscht werden',
        'error'
      );
    }
  };

  // Update handleSubmitTransaction
  const handleSubmitTransaction = async (data: {
    date: string;
    amount: number;
    direction: 'Incoming' | 'Outgoing';
    details: string;
    is_simulation: boolean;
  }) => {
    if (!user?.id) {
      showNotification(
        'Bitte melden Sie sich an, um Transaktionen zu erstellen',
        'error'
      );
      return;
    }

    try {
      if (editingTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from('buchungen')
          .update({
            date: data.date,
            amount: data.amount,
            direction: data.direction,
            details: data.details,
            is_simulation: data.is_simulation,
            kategorie: data.is_simulation ? 'Simulation' : 'Manual',
          })
          .eq('id', editingTransaction.id)
          .eq('user_id', user.id)
          .eq('modified', true); // Only update manual transactions

        if (error) throw error;

        showNotification(
          'Transaktion wurde erfolgreich aktualisiert',
          'success'
        );
      } else {
        // Create new transaction
        const { error } = await supabase
          .from('buchungen')
          .insert([
            {
              id: uuidv4(),
              date: data.date,
              amount: data.amount,
              direction: data.direction,
              details: data.details,
              is_simulation: data.is_simulation,
              kategorie: data.is_simulation ? 'Simulation' : 'Manual',
              user_id: user.id,
              modified: true,
            },
          ]);

        if (error) throw error;

        showNotification(
          'Transaktion wurde erfolgreich erstellt',
          'success'
        );
      }

      // Reset editing state
      setEditingTransaction(null);
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      showNotification(
        'Transaktion konnte nicht gespeichert werden',
        'error'
      );
    }
  };

  return (
    <div className="space-y-6">
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
          <div className="flex items-center pr-4">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="px-4 py-2 bg-vaios-primary text-white rounded-md hover:bg-vaios-primary/90 transition-colors"
            >
              Neue Transaktion
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
          
          <div className="mt-3 flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="fixkosten"
                checked={showFixkosten} 
                onChange={(e) => setShowFixkosten(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-vaios-primary focus:ring-vaios-primary"
              />
              <label htmlFor="fixkosten" className="text-sm text-gray-700">
                Fixkosten 📌
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="lohn"
                checked={showLoehne} 
                onChange={(e) => setShowLoehne(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-vaios-primary focus:ring-vaios-primary"
              />
              <label htmlFor="lohn" className="text-sm text-gray-700">
                Lohnauszahlungen 💰
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="standard"
                checked={showStandard} 
                onChange={(e) => setShowStandard(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-vaios-primary focus:ring-vaios-primary"
              />
              <label htmlFor="standard" className="text-sm text-gray-700">
                Standard
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="manual"
                checked={showManual} 
                onChange={(e) => setShowManual(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-vaios-primary focus:ring-vaios-primary"
              />
              <label htmlFor="manual" className="text-sm text-gray-700">
                Manuelle Transaktionen ✏️
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="simulations"
                checked={showSimulations} 
                onChange={(e) => setShowSimulations(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-vaios-primary focus:ring-vaios-primary"
              />
              <label htmlFor="simulations" className="text-sm text-gray-700">
                Simulationen 🔮
              </label>
            </div>
          </div>
        </div>
        
        {/* Content area */}
        <div className="bg-white">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500">Daten werden geladen...</p>
            </div>
          ) : error ? (
            <div className="p-8">
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
            </div>
          ) : (
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
                    {filteredTransactions.some(tx => tx.modified) && (
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktionen
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => {
                    const isIncome = transaction.direction === 'Incoming';
                    const amountClass = isIncome ? 'text-green-600' : 'text-red-600';
                    
                    return (
                      <tr 
                        key={transaction.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(transaction.date, 'dd.MM.yyyy', { locale: de })}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {transaction.hinweis && <span className="mr-1">{transaction.hinweis}</span>}
                          {transaction.details}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.kategorie?.toLowerCase() === 'lohn' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              💰 Lohn
                            </span>
                          ) : transaction.kategorie?.toLowerCase() === 'fixkosten' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              📌 Fixkosten
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${amountClass}`}>
                          {isIncome ? '+' : '-'}{formatCHF(Math.abs(transaction.amount))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                          {formatCHF(transaction.kontostand || 0)}
                        </td>
                        {transaction.modified && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditTransaction(transaction)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction)}
                                className="text-red-600 hover:text-red-800"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSubmitTransaction}
        initialData={editingTransaction ? {
          date: editingTransaction.date.toISOString().split('T')[0],
          amount: editingTransaction.amount,
          direction: editingTransaction.direction,
          details: editingTransaction.details || '',
          is_simulation: editingTransaction.is_simulation || false,
        } : undefined}
      />
    </div>
  );
} 