'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import { 
  loadBuchungen, 
  addBuchung, 
  updateBuchungById, 
  deleteBuchungById,
  enhanceTransactions 
} from "@/lib/services/buchungen";
import { getUserSettings } from "@/lib/services/user-settings";
import { Buchung, EnhancedTransaction } from "@/models/types";
import { formatCHF } from "@/lib/currency";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useNotification } from "@/components/ui/Notification";

export default function TransaktionenPage() {
  const { authState } = useAuth();
  const { user, isReadOnly } = authState;
  const { showNotification } = useNotification();
  
  // Add logging to check isReadOnly status
  useEffect(() => {
    console.log("Auth state loaded:", { isReadOnly, isAuthenticated: !!user });
  }, [isReadOnly, user]);
  
  // State for transactions
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<EnhancedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // State for transaction being edited
  const [editingTransaction, setEditingTransaction] = useState<Buchung | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  
  // Add logging to track form visibility state
  useEffect(() => {
    console.log("Form visibility changed:", { showTransactionForm });
  }, [showTransactionForm]);
  
  // Form state
  const [transactionForm, setTransactionForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    details: '',
    amount: 0,
    direction: 'Outgoing',
    kategorie: 'Standard'
  });
  
  // Filter state
  const [searchText, setSearchText] = useState('');
  const [showModifiedOnly, setShowModifiedOnly] = useState(false);
  
  // Fetch transactions
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        showNotification('Lade Transaktionen aus Supabase...', 'loading');
        
        // Load user settings for starting balance
        const settings = await getUserSettings(user.id);
        const startBalance = settings.start_balance;
        
        // Load transactions
        const data = await loadBuchungen(user.id);
        
        // Enhance transactions with running balance
        const enhancedTx = enhanceTransactions(data, startBalance);
        setTransactions(enhancedTx);
        applyFilters(enhancedTx);
        
        showNotification(`${data.length} Transaktionen geladen`, 'success');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setError('Fehler beim Laden der Transaktionen. Bitte versuchen Sie es später erneut.');
        showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
        setTransactions([]);
        setFilteredTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user?.id, showNotification]);
  
  // Apply filters when filter criteria change
  useEffect(() => {
    applyFilters(transactions);
  }, [searchText, showModifiedOnly]);
  
  // Apply filters
  const applyFilters = (allTransactions: EnhancedTransaction[]) => {
    let filtered = allTransactions;
    
    // Apply text search
    if (searchText) {
      filtered = filtered.filter(tx => 
        tx.details.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // Filter by modified status
    if (showModifiedOnly) {
      filtered = filtered.filter(tx => tx.modified);
    }
    
    // Sort by date (most recent first)
    filtered = [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    setFilteredTransactions(filtered);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setTransactionForm({
      ...transactionForm,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    });
  };
  
  // Reset form
  const resetForm = () => {
    console.log("Resetting form");
    setTransactionForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      details: '',
      amount: 0,
      direction: 'Outgoing',
      kategorie: 'Standard'
    });
    setEditingTransaction(null);
    // Don't modify the showTransactionForm state here
    // This is now handled in toggleTransactionForm
  };
  
  // Prepare form for editing
  const prepareEditTransaction = (transaction: Buchung) => {
    console.log("Preparing to edit transaction:", transaction.id);
    setEditingTransaction(transaction);
    setTransactionForm({
      date: format(transaction.date, 'yyyy-MM-dd'),
      details: transaction.details,
      amount: transaction.amount,
      direction: transaction.direction,
      kategorie: transaction.kategorie || 'Standard'
    });
    // Make sure the form is visible
    if (!showTransactionForm) {
      console.log("Showing transaction form for editing");
      setShowTransactionForm(true);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");
    
    if (!user?.id) {
      console.error("No user ID available for submission");
      return;
    }
    
    if (!transactionForm.details.trim()) {
      setError('Bitte geben Sie eine Beschreibung ein.');
      return;
    }
    
    if (transactionForm.amount <= 0) {
      setError('Bitte geben Sie einen gültigen Betrag ein.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      showNotification('Speichere Transaktion in Supabase...', 'loading');
      const date = new Date(transactionForm.date);
      const details = transactionForm.details.trim();
      const amount = transactionForm.amount;
      const direction = transactionForm.direction as 'Incoming' | 'Outgoing';
      const kategorie = transactionForm.kategorie;
      
      if (editingTransaction) {
        // Update existing transaction
        const result = await updateBuchungById(
          editingTransaction.id,
          {
            date,
            details,
            amount,
            direction,
            kategorie
          },
          user.id
        );
        
        console.log("Transaction updated:", result);
        
        // Update state
        const updatedTransactions = transactions.map(tx => 
          tx.id === editingTransaction.id ? { ...result } as EnhancedTransaction : tx
        );
        const enhancedTx = enhanceTransactions(updatedTransactions as Buchung[]);
        setTransactions(enhancedTx);
        applyFilters(enhancedTx);
        
        setSuccessMessage('Transaktion erfolgreich aktualisiert.');
        showNotification('Transaktion erfolgreich in Supabase aktualisiert', 'success');
      } else {
        // Add new transaction
        const result = await addBuchung(
          date,
          details,
          amount,
          direction,
          user.id,
          kategorie
        );
        
        console.log("New transaction added:", result);
        
        // Update state
        const newTransactions = [...transactions, result] as Buchung[];
        const enhancedTx = enhanceTransactions(newTransactions);
        setTransactions(enhancedTx);
        applyFilters(enhancedTx);
        
        setSuccessMessage('Transaktion erfolgreich hinzugefügt.');
        showNotification('Transaktion erfolgreich in Supabase gespeichert', 'success');
      }
      
      // Reset form and hide it
      resetForm();
      setShowTransactionForm(false);
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error saving transaction:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Speichern der Transaktion.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle transaction deletion
  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Transaktion wirklich löschen? Dieser Vorgang wirkt sich direkt auf die Supabase-Datenbank aus.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      showNotification('Lösche Transaktion aus Supabase...', 'loading');
      await deleteBuchungById(id);
      
      // Update state
      const updatedTransactions = transactions.filter(tx => tx.id !== id);
      setTransactions(updatedTransactions);
      applyFilters(updatedTransactions);
      
      setSuccessMessage('Transaktion erfolgreich gelöscht.');
      showNotification('Transaktion erfolgreich aus Supabase gelöscht', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Löschen der Transaktion.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Specific function to toggle form visibility
  const toggleTransactionForm = () => {
    const newState = !showTransactionForm;
    console.log("Toggling form visibility to:", newState);
    setShowTransactionForm(newState);
    
    // If showing the form, reset form values
    if (newState === true) {
      resetForm();
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transaktionen-Editor</h1>
        <button
          onClick={toggleTransactionForm}
          disabled={isReadOnly || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          aria-label={showTransactionForm ? 'Abbrechen' : 'Neue Transaktion'}
        >
          {showTransactionForm ? 'Abbrechen' : 'Neue Transaktion'}
        </button>
      </div>
      
      {/* Read-only warning if applicable */}
      {isReadOnly && (
        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Lesemodus aktiv</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Sie haben nur Leserechte. Das Hinzufügen oder Bearbeiten von Transaktionen ist nicht möglich.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 p-4 rounded-md border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}
      
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
      
      {/* Transaction Form */}
      {showTransactionForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingTransaction ? 'Transaktion bearbeiten' : 'Neue Transaktion erstellen'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Datum
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={transactionForm.date}
                  onChange={handleInputChange}
                  disabled={isReadOnly || loading}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Betrag (CHF)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={handleInputChange}
                  disabled={isReadOnly || loading}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <input
                id="details"
                name="details"
                type="text"
                value={transactionForm.details}
                onChange={handleInputChange}
                disabled={isReadOnly || loading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="direction" className="block text-sm font-medium text-gray-700 mb-1">
                  Richtung
                </label>
                <select
                  id="direction"
                  name="direction"
                  value={transactionForm.direction}
                  onChange={handleInputChange}
                  disabled={isReadOnly || loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Incoming">Einnahme</option>
                  <option value="Outgoing">Ausgabe</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="kategorie" className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie
                </label>
                <select
                  id="kategorie"
                  name="kategorie"
                  value={transactionForm.kategorie}
                  onChange={handleInputChange}
                  disabled={isReadOnly || loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Standard">Standard</option>
                  <option value="Fixkosten">Fixkosten</option>
                  <option value="Lohn">Lohn</option>
                  <option value="Simulation">Simulation</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isReadOnly || loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird gespeichert...' : editingTransaction ? 'Aktualisieren' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="searchText" className="block text-sm font-medium text-gray-700 mb-1">
              Suche in Beschreibung
            </label>
            <input
              id="searchText"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Suchbegriff eingeben..."
            />
          </div>
          
          <div className="flex items-end">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={showModifiedOnly}
                onChange={(e) => setShowModifiedOnly(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Nur bearbeitete Einträge anzeigen ✏️</span>
            </label>
          </div>
          
          <div className="flex items-end justify-end">
            <span className="text-sm text-gray-500">
              {filteredTransactions.length} Transaktion(en) gefunden
            </span>
          </div>
        </div>
      </div>
      
      {/* Transaction Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading && filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Daten werden geladen...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Keine Transaktionen gefunden.</p>
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
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const isIncome = transaction.direction === 'Incoming';
                  const amountClass = isIncome ? 'text-green-600' : 'text-red-600';
                  
                  return (
                    <tr key={transaction.id} className={transaction.modified ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(transaction.date, 'dd.MM.yyyy')}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => prepareEditTransaction(transaction)}
                          disabled={isReadOnly || loading}
                          className="text-blue-600 hover:text-blue-800 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          disabled={isReadOnly || loading}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 