'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import { loadBuchungen, enhanceTransactions, filterTransactions } from "@/lib/services/buchungen";
import { loadFixkosten, convertFixkostenToBuchungen } from "@/lib/services/fixkosten";
import { loadMitarbeiter } from "@/lib/services/mitarbeiter";
import { loadLohnkosten, convertLohnkostenToBuchungen } from "@/lib/services/lohnkosten";
import { getUserSettings } from "@/lib/services/user-settings";
import { getCurrentBalance } from "@/lib/services/daily-balance";
import { EnhancedTransaction } from "@/models/types";
import { formatCHF } from "@/lib/currency";
import { format, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import { useNotification } from "@/components/ui/Notification";
import { loadFixkostenOverrides } from "@/lib/services/fixkosten-overrides";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { Button } from "@/components/ui/button";
// Dashboard KPI and chart intentionally not used on Planung
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@tremor/react";
import PlanningFilters from "@/components/planning/PlanningFilters";
import { Card, Title, Text, Divider } from "@tremor/react";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Small inline icon for Tremor TextInput
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Planung() {
  const { authState } = useAuth();
  const { user } = authState;
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('monthly');
  // Persisted filters
  useEffect(() => {
    try {
      const lsTab = typeof window !== 'undefined' ? window.localStorage.getItem('planung:activeTab') : null;
      if (lsTab === 'monthly' || lsTab === 'quarterly' || lsTab === 'yearly') setActiveTab(lsTab);
      const lsIncoming = typeof window !== 'undefined' ? window.localStorage.getItem('planung:showIncoming') : null;
      if (lsIncoming !== null) setShowIncoming(lsIncoming === '1');
      const lsOutgoing = typeof window !== 'undefined' ? window.localStorage.getItem('planung:showOutgoing') : null;
      if (lsOutgoing !== null) setShowOutgoing(lsOutgoing === '1');
      const lsCategories = typeof window !== 'undefined' ? window.localStorage.getItem('planung:categories') : null;
      if (lsCategories) {
        try {
          const parsed = JSON.parse(lsCategories);
          setShowFixkosten(parsed.includes('Fixkosten'));
          setShowLoehne(parsed.includes('Lohn'));
          setShowStandard(parsed.includes('Standard'));
          setShowManual(parsed.includes('Manual'));
          setShowSimulations(parsed.includes('Simulation'));
        } catch {}
      }
      const lsSearch = typeof window !== 'undefined' ? window.localStorage.getItem('planung:search') : null;
      if (lsSearch !== null) setSearchText(lsSearch);
      const lsStart = typeof window !== 'undefined' ? window.localStorage.getItem('planung:startDate') : null;
      const lsEnd = typeof window !== 'undefined' ? window.localStorage.getItem('planung:endDate') : null;
      if (lsStart && lsEnd) {
        const s = new Date(lsStart);
        const e = new Date(lsEnd);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) { setStartDate(s); setEndDate(e); }
      }
    } catch {}
  }, []);
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
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
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
  const [showIncoming, setShowIncoming] = useState(true);
  const [showOutgoing, setShowOutgoing] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [sortOption, setSortOption] = useState('date-asc');
  
  // Add simulation state
  const [showSimulations, setShowSimulations] = useState(true);

  // Add confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<EnhancedTransaction | null>(null);
  
  // Store current balance for recalculations
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  // Fetch all data
  const fetchData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load current balance and other data
      const [currentBalanceData, settings, buchungen, fixkosten, lohnkostenData, overridesData] = await Promise.all([
        getCurrentBalance(),
        getUserSettings(user.id),
        loadBuchungen(user.id),
        loadFixkosten(user.id),
        loadLohnkosten(user.id),
        loadFixkostenOverrides(user.id)
      ]);
      
      // Store current balance for filter recalculations
      const currentBalanceValue = currentBalanceData.balance;
      setCurrentBalance(currentBalanceValue);
      
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
      
      // Apply filters with current balance immediately available
      applyFiltersWithBalance(enhancedTx, currentBalanceValue);
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

  // Persist selected filters
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('planung:activeTab', activeTab);
        window.localStorage.setItem('planung:showIncoming', showIncoming ? '1' : '0');
        window.localStorage.setItem('planung:showOutgoing', showOutgoing ? '1' : '0');
        const categories: string[] = [];
        if (showFixkosten) categories.push('Fixkosten');
        if (showLoehne) categories.push('Lohn');
        if (showStandard) categories.push('Standard');
        if (showManual) categories.push('Manual');
        if (showSimulations) categories.push('Simulation');
        window.localStorage.setItem('planung:categories', JSON.stringify(categories));
        window.localStorage.setItem('planung:search', searchText);
        window.localStorage.setItem('planung:startDate', startDate.toISOString());
        window.localStorage.setItem('planung:endDate', endDate.toISOString());
      }
    } catch {}
  }, [activeTab, showIncoming, showOutgoing, showFixkosten, showLoehne, showStandard, showManual, showSimulations, searchText, startDate, endDate]);
  
  // Apply filters when filter criteria change
  useEffect(() => {
    applyFilters(transactions);
  }, [searchText, sortOption, showFixkosten, showLoehne, showStandard, showManual, showSimulations, showIncoming, showOutgoing]);
  
  // Filter function with explicit balance parameter
  const applyFiltersWithBalance = (allTransactions: EnhancedTransaction[], balanceToUse: number) => {
    // Filter transactions to only show future dates starting from startDate
    // This ensures consistent date handling with fixkosten generation
    let filtered = allTransactions.filter(tx => tx.date >= startDate);
    
    // Then filter by transaction type
    filtered = filtered.filter(tx => {
      if (tx.kategorie?.toLowerCase() === 'fixkosten') return showFixkosten;
      if (tx.kategorie?.toLowerCase() === 'lohn') return showLoehne;
      if (tx.kategorie?.toLowerCase() === 'simulation') return showSimulations;
      if (tx.modified) return showManual; // Filter manual transactions
      return showStandard; // All other categories are considered Standard
    });

    // Filter by direction (Incoming/Outgoing)
    filtered = filtered.filter(tx => {
      if (tx.direction === 'Incoming') return showIncoming;
      if (tx.direction === 'Outgoing') return showOutgoing;
      return true;
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
    
    // Recalculate running balance based only on visible transactions
    let runningBalance = balanceToUse;
    const recalculatedTransactions = filtered.map(tx => {
      // Update running balance based on transaction direction
      if (tx.direction === 'Incoming') {
        runningBalance += tx.amount;
      } else {
        runningBalance -= tx.amount;
      }
      
      // Return transaction with recalculated balance
      return {
        ...tx,
        kontostand: runningBalance
      };
    });
    
    setFilteredTransactions(recalculatedTransactions);
  };
  
  // Wrapper function that uses current balance from state
  const applyFilters = (allTransactions: EnhancedTransaction[]) => {
    applyFiltersWithBalance(allTransactions, currentBalance);
  };
  
  // Tab period selection
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    switch (tab) {
      case 'monthly':
        // Tomorrow + 3 months (excluding today)
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
        end = addMonths(start, 3);
        break;
      case 'quarterly':
        // Tomorrow + 9 months (excluding today)
        const tomorrowQ = new Date(now);
        tomorrowQ.setDate(now.getDate() + 1);
        start = new Date(tomorrowQ.getFullYear(), tomorrowQ.getMonth(), tomorrowQ.getDate());
        end = addMonths(start, 9);
        break;
      case 'yearly':
        // Tomorrow + 1 year (excluding today)
        const tomorrowY = new Date(now);
        tomorrowY.setDate(now.getDate() + 1);
        start = new Date(tomorrowY.getFullYear(), tomorrowY.getMonth(), tomorrowY.getDate());
        end = addMonths(start, 12);
        break;
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  
  const handleEditTransaction = (transaction: EnhancedTransaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (transaction: EnhancedTransaction) => {
    setTransactionToDelete(transaction);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete?.id) return;

    try {
      const { error } = await supabase
        .from('buchungen')
        .delete()
        .eq('id', transactionToDelete.id);

      if (error) throw error;

      showNotification(
        'Transaktion wurde gelöscht',
        'success'
      );

      // Refresh data
      fetchData();
    } catch (error) {
      showNotification(
        'Transaktion konnte nicht gelöscht werden',
        'error'
      );
    } finally {
      setDeleteConfirmOpen(false);
      setTransactionToDelete(null);
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
            date: new Date(data.date).toISOString(),
            amount: data.amount,
            direction: data.direction,
            details: data.details,
            is_simulation: data.is_simulation,
            kategorie: data.is_simulation ? 'Simulation' : 'Manual',
            modified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTransaction.id)
          ;

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
              date: new Date(data.date).toISOString(),
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
      <PlanningFilters
        activeTab={activeTab as any}
        onTabChange={(t)=>handleTabChange(t)}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(from?: Date, to?: Date)=>{ if (from) setStartDate(from); if (to) setEndDate(to); }}
        searchText={searchText}
        onSearch={(v)=>setSearchText(v)}
        selectedCategories={[
          ...(showFixkosten ? ['Fixkosten'] : []),
          ...(showLoehne ? ['Lohn'] : []),
          ...(showStandard ? ['Standard'] : []),
          ...(showManual ? ['Manual'] : []),
          ...(showSimulations ? ['Simulation'] : []),
        ]}
        onCategoriesChange={(vals)=>{
          setShowFixkosten(vals.includes('Fixkosten'));
          setShowLoehne(vals.includes('Lohn'));
          setShowStandard(vals.includes('Standard'));
          setShowManual(vals.includes('Manual'));
          setShowSimulations(vals.includes('Simulation'));
        }}
        showIncoming={showIncoming}
        onToggleIncoming={(v)=>setShowIncoming(!!v)}
        showOutgoing={showOutgoing}
        onToggleOutgoing={(v)=>setShowOutgoing(!!v)}
        sortOption={sortOption as any}
        onSortChange={(v)=>setSortOption(v)}
        onNewTransaction={()=>setIsFormOpen(true)}
      />
      {/* Content area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_,i)=>(
              <div key={i} className="h-10 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="p-6 text-center text-red-500">{error}</Card>
      ) : (
        <Card className="p-6">
          <Title className="text-gray-900 mb-2">Transaktionen</Title>
          <Divider />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="text-xs text-gray-500">Datum</TableHeaderCell>
                <TableHeaderCell className="text-xs text-gray-500">Beschreibung</TableHeaderCell>
                <TableHeaderCell className="text-xs text-gray-500">Kategorie</TableHeaderCell>
                <TableHeaderCell className="text-right text-xs text-gray-500">Betrag</TableHeaderCell>
                <TableHeaderCell className="text-right text-xs text-gray-500">Kontostand</TableHeaderCell>
                <TableHeaderCell className="text-right text-xs text-gray-500">Aktionen</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="rounded bg-gray-50 p-3 text-sm text-gray-500">Keine Transaktionen</div>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.map((transaction) => {
                const isIncome = transaction.direction === 'Incoming';
                const amountClass = isIncome ? 'text-emerald-600' : 'text-red-600';
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm text-gray-600">{format(transaction.date, 'dd.MM.yyyy', { locale: de })}</TableCell>
                    <TableCell className="text-sm text-gray-900">{transaction.details}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        transaction.kategorie === 'Lohn' ? 'bg-amber-100 text-amber-800' :
                        transaction.kategorie === 'Fixkosten' ? 'bg-blue-100 text-blue-800' :
                        transaction.kategorie === 'Simulation' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {transaction.kategorie === 'Lohn' ? (
                            <path d="M12 1v22M5 6h14M5 12h14M5 18h14"/>
                          ) : transaction.kategorie === 'Fixkosten' ? (
                            <path d="M3 3h18v6H3zM3 9v12h18V9"/>
                          ) : transaction.kategorie === 'Simulation' ? (
                            <circle cx="12" cy="12" r="4"/>
                          ) : (
                            <rect x="4" y="4" width="16" height="16" rx="2"/>
                          )}
                        </svg>
                        {transaction.kategorie || 'Standard'}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${amountClass}`}>
                      {isIncome ? '+' : '-'}{formatCHF(Math.abs(transaction.amount))}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-gray-900">{formatCHF(transaction.kontostand || 0)}</TableCell>
                    <TableCell className="text-right">
                      {transaction.kategorie !== 'Fixkosten' && transaction.kategorie !== 'Lohn' && (
                        <div className="inline-flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditTransaction(transaction)} className="text-blue-600 hover:text-blue-800">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(transaction)} className="text-red-600 hover:text-red-800">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaktion löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Transaktion löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction form dialog */}
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
          details: editingTransaction.details,
          is_simulation: editingTransaction.kategorie === 'Simulation'
        } : undefined}
      />
    </div>
  );
} 