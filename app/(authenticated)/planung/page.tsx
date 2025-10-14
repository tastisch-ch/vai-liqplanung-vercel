'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import { loadBuchungen, enhanceTransactions, filterTransactions } from "@/lib/services/buchungen";
import { loadFixkosten, convertFixkostenToBuchungen } from "@/lib/services/fixkosten";
import { loadMitarbeiter } from "@/lib/services/mitarbeiter";
import { loadLohnkosten, convertLohnkostenToBuchungen } from "@/lib/services/lohnkosten";
import { loadSimulationen, convertSimulationenToBuchungen } from "@/lib/services/simulationen";
import { getUserSettings } from "@/lib/services/user-settings";
import { getCurrentBalance } from "@/lib/services/daily-balance";
import { EnhancedTransaction } from "@/models/types";
import { formatCHF } from "@/lib/currency";
import { format, addMonths } from "date-fns";
import { cx } from "@/lib/utils";
import { de } from "date-fns/locale";
import { useNotification } from "@/components/ui/Notification";
import { loadFixkostenOverrides } from "@/lib/services/fixkosten-overrides";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { Button } from "@/components/ui/button";
import { TableRoot, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/tremor-table";
import PageHeader from "@/components/layout/PageHeader";
import { RiAddLine, RiMagicLine, RiCoinsLine, RiPushpin2Line, RiUser3Line, RiEdit2Line, RiDeleteBin6Line, RiPencilLine } from "@remixicon/react";
import PlanningFilters from "@/components/planning/PlanningFilters";
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  });
  
  const [endDate, setEndDate] = useState<Date>(() => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setMonth(now.getMonth() + 6);
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
      const [currentBalanceData, settings, buchungen, fixkosten, lohnkostenData, overridesData, simulationen] = await Promise.all([
        getCurrentBalance(),
        getUserSettings(user.id),
        loadBuchungen(user.id),
        loadFixkosten(user.id),
        loadLohnkosten(user.id),
        loadFixkostenOverrides(user.id),
        loadSimulationen(user.id)
      ]);
      
      // Store current balance for filter recalculations
      const currentBalanceValue = currentBalanceData.balance;
      setCurrentBalance(currentBalanceValue);
      
      // Convert fixed costs and salaries to transactions
      let allTransactions = [...buchungen];
      
      // Always load all transactions, filtering happens in applyFilters
      const fixkostenBuchungen = convertFixkostenToBuchungen(startDate, endDate, fixkosten, overridesData);
      const lohnBuchungen = convertLohnkostenToBuchungen(startDate, endDate, lohnkostenData.map(item => item.mitarbeiter));
      const simulationBuchungen = convertSimulationenToBuchungen(startDate, endDate, simulationen);
      
      allTransactions = [
        ...allTransactions,
        ...fixkostenBuchungen,
        ...lohnBuchungen,
        ...simulationBuchungen
      ];
      
      // Enhance transactions with running balance
      const enhancedTx = await enhanceTransactions(allTransactions);
      setTransactions(enhancedTx);
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

  // (Sticky header intentionally disabled)

  // Listen for date range changes from PlanningFilters
  useEffect(() => {
    const handler = (e: any) => {
      const { from, to } = e.detail || {};
      if (!from || !to) return;
      setStartDate(new Date(from));
      setEndDate(new Date(to));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('planning:date-range', handler as EventListener);
      return () => window.removeEventListener('planning:date-range', handler as EventListener);
    }
  }, []);

  // Listen for categories filtering
  useEffect(() => {
    const handler = (e: any) => {
      const selected: string[] = e.detail || [];
      // apply immediate filtering by toggling category flags
      setShowFixkosten(selected.includes('Fixkosten'));
      setShowLoehne(selected.includes('Lohn'));
      setShowStandard(selected.includes('Standard'));
      setShowManual(selected.includes('Manual'));
      setShowSimulations(selected.includes('Simulation'));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('planning:categories', handler as EventListener);
      return () => window.removeEventListener('planning:categories', handler as EventListener);
    }
  }, []);

  // Listen for direction toggles (incoming/outgoing)
  useEffect(() => {
    const handler = (e: any) => {
      const selected: string[] = e.detail || [];
      setShowIncoming(selected.includes('incoming'));
      setShowOutgoing(selected.includes('outgoing'));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('planning:direction', handler as EventListener);
      return () => window.removeEventListener('planning:direction', handler as EventListener);
    }
  }, []);

  // Listen for full-text search
  useEffect(() => {
    const handler = (e: any) => {
      const q: string = e.detail ?? '';
      setSearchText(q);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('planning:search', handler as EventListener);
      return () => window.removeEventListener('planning:search', handler as EventListener);
    }
  }, []);
  
  // Apply filters when filter criteria change
  useEffect(() => {
    applyFiltersWithBalance(transactions, currentBalance);
  }, [searchText, sortOption, showFixkosten, showLoehne, showStandard, showManual, showSimulations, showIncoming, showOutgoing, transactions, currentBalance]);
  
  // Filter function with explicit balance parameter
  const applyFiltersWithBalance = (allTransactions: EnhancedTransaction[], balanceToUse: number) => {
    // Filter transactions to only show future dates starting from startDate
    // This ensures consistent date handling with fixkosten generation
    let filtered = allTransactions.filter(tx => tx.date >= startDate);
    
    // Exclude invoices already settled from future planning (but never exclude simulations)
    filtered = filtered.filter(tx => {
      const isSimulation = tx.kategorie === 'Simulation' || (tx as any).is_simulation === true;
      if (isSimulation) return true;
      const status = (tx as any).invoice_status as string | undefined;
      const paidAt = (tx as any).paid_at as string | Date | undefined | null;
      const isSettled = status === 'paid' || status === 'canceled' || !!paidAt;
      return !isSettled;
    });

    // Then filter by transaction type
    filtered = filtered.filter(tx => {
      if (tx.kategorie?.toLowerCase() === 'fixkosten') return showFixkosten;
      if (tx.kategorie?.toLowerCase() === 'lohn') return showLoehne;
      if (tx.kategorie?.toLowerCase() === 'simulation') return showSimulations;
      if (tx.modified) return showManual; // Filter manual entries
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
    <div className="container mx-auto p-4 space-y-6 overflow-x-hidden">
      <PageHeader title="Planung" subtitle="Übersicht und Filter für Transaktionen" />
      <PlanningFilters />
        
        {/* Content area */}
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            Lade Daten...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            {error}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Keine Transaktionen gefunden.
          </div>
        ) : (
          <>
          <div className="max-w-[100vw] md:max-w-[calc(100vw-6rem)] overflow-x-hidden">
          <TableRoot>
            <div className="sm:flex sm:items-center sm:justify-between sm:space-x-10 px-1">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-50">Transaktionen</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">Gefilterte Liste im gewählten Zeitraum.</p>
              </div>
              <Button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-[#CEFF65] text-[#02403D] hover:bg-[#C2F95A] border border-[#CEFF65]">
                <RiAddLine className="h-4 w-4" />
                Transaktion
              </Button>
            </div>
            <Table className="mt-4 hidden md:table table-fixed w-full">
              <TableHead>
                <TableRow className="border-b border-gray-200 dark:border-gray-800">
                  <TableHeaderCell className="w-[8rem]">Datum</TableHeaderCell>
                  <TableHeaderCell className="w-[1fr]">Beschreibung</TableHeaderCell>
                  <TableHeaderCell className="w-[10rem]">Kategorie</TableHeaderCell>
                  <TableHeaderCell className="text-right w-[8rem]">Betrag</TableHeaderCell>
                  <TableHeaderCell className="text-right w-[10rem]">Kontostand</TableHeaderCell>
                  <TableHeaderCell className="text-right w-[8rem]">Aktionen</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const isIncome = transaction.direction === 'Incoming';
                  const amountClass = isIncome ? 'text-emerald-600' : 'text-rose-600';
                  const categoryBadge = transaction.kategorie === 'Lohn' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <RiUser3Line className="h-3.5 w-3.5" /> Lohn
                          </span>
                        ) : transaction.kategorie === 'Fixkosten' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                      <RiPushpin2Line className="h-3.5 w-3.5 text-sky-700" /> Fixkosten
                          </span>
                        ) : transaction.kategorie === 'Simulation' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                      <RiMagicLine className="h-3.5 w-3.5 text-violet-700" /> Simulation
                    </span>
                  ) : transaction.modified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      <RiEdit2Line className="h-3.5 w-3.5 text-orange-700" /> Manuell
                          </span>
                        ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                      <RiCoinsLine className="h-3.5 w-3.5 text-stone-700" /> Standard
                          </span>
                  );
                  return (
                    <TableRow key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <TableCell className="text-gray-500">{format(transaction.date, 'dd.MM.yyyy', { locale: de })}</TableCell>
                      <TableCell className="text-gray-900 max-w-[60vw] truncate whitespace-nowrap overflow-hidden text-ellipsis" title={transaction.details}>{transaction.details}</TableCell>
                      <TableCell className="text-gray-600">{categoryBadge}</TableCell>
                      <TableCell className={cx("text-right tabular-nums font-medium", amountClass)}>
                        <span className="mr-1">{isIncome ? '+' : '-'}</span>
                        {formatCHF(Math.abs(transaction.amount))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-gray-900">{formatCHF(transaction.kontostand || 0)}</TableCell>
                      <TableCell className="text-right">
                        {transaction.kategorie !== 'Fixkosten' && transaction.kategorie !== 'Lohn' && (
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditTransaction(transaction)} className="text-gray-600 hover:text-gray-900 cursor-pointer">
                              <RiPencilLine className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(transaction)} className="text-rose-600 hover:text-rose-700 cursor-pointer">
                              <RiDeleteBin6Line className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableRoot>
          </div>
          {/* Mobile compact list */}
          <div className="md:hidden space-y-2 mt-4">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.direction === 'Incoming';
              const amountClass = isIncome ? 'text-emerald-700' : 'text-rose-700';
              return (
                <div key={tx.id} className="rounded-md border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-950">
                  {/* Zeile 1: Details */}
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-50 line-clamp-2 break-anywhere" title={tx.details}>{tx.details}</div>
                  {/* Zeile 2: Betrag */}
                  <div className={`mt-1 tabular-nums text-base font-semibold ${amountClass}`}>
                    <span className="mr-1">{isIncome ? '+' : '-'}</span>{formatCHF(Math.abs(tx.amount))}
                  </div>
                  {/* Zeile 3: Datum */}
                  <div className="mt-1 text-xs text-gray-500">{format(tx.date, 'dd.MM.yyyy', { locale: de })}</div>
                  {/* Zeile 4: Kategorie + Kontostand */}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                    <div className="inline-flex items-center gap-2">
                      {tx.kategorie === 'Lohn' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Lohn</span>
                      ) : tx.kategorie === 'Fixkosten' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Fixkosten</span>
                      ) : tx.kategorie === 'Simulation' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Simulation</span>
                      ) : tx.modified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">Manuell</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">Standard</span>
                      )}
                    </div>
                    <div className="text-gray-700">KS: {formatCHF(tx.kontostand || 0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
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
          date: editingTransaction!.date.toISOString().split('T')[0],
          amount: editingTransaction!.amount,
          direction: editingTransaction!.direction,
          details: editingTransaction!.details,
          is_simulation: editingTransaction!.kategorie === 'Simulation'
        } : undefined}
      />
    </div>
  );
} 