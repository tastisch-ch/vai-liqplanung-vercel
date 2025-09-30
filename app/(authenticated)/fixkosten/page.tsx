'use client';

import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import type { Fixkosten } from "@/models/types";
import { 
  loadFixkosten, 
  addFixkosten, 
  updateFixkostenById, 
  deleteFixkostenById,
  calculateMonthlyCosts,
  filterActiveFixkosten,
  isFixkostenActive,
  getFixkostenCategories,
  filterFixkostenByCategory
} from "@/lib/services/fixkosten";
import { TableRoot, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/tremor-table";
import { formatCHF } from "@/lib/currency";
import { format, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import { useNotification } from "@/components/ui/Notification";
import Link from "next/link";

export default function Fixkosten() {
  const { authState } = useAuth();
  const { user, isReadOnly } = authState;
  const { showNotification } = useNotification();
  
  // State for fixed costs list and filtering
  const [fixkosten, setFixkosten] = useState<Fixkosten[]>([]);
  const [filteredFixkosten, setFilteredFixkosten] = useState<Fixkosten[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [rhythmusFilter, setRhythmusFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(['Allgemein']);
  const [newCategory, setNewCategory] = useState<string>('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  
  // State for showing the new fixkosten modal
  const [showFixkostenModal, setShowFixkostenModal] = useState(false);
  
  // State for creating new fixed cost
  const [newFixkosten, setNewFixkosten] = useState<Partial<Fixkosten>>({
    name: '',
    betrag: 0,
    rhythmus: 'monatlich',
    start: new Date(),
    enddatum: null,
    kategorie: 'Allgemein'
  });
  
  // State for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFixkosten, setEditingFixkosten] = useState<Fixkosten | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Fetch fixed costs data
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        showNotification('Lade Fixkosten aus Supabase...', 'loading');
        const [fixkostenData, categoriesData] = await Promise.all([
          loadFixkosten(user.id),
          getFixkostenCategories(user.id)
        ]);
        
        setFixkosten(fixkostenData);
        setCategories(categoriesData);
        applyFilters(fixkostenData);
        showNotification(`${fixkostenData.length} Fixkosten geladen`, 'success');
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'Fehler beim Laden der Daten');
        setFixkosten([]);
        setFilteredFixkosten([]);
        setShowOnlyActive(true);
        setRhythmusFilter([]);
        setCategoryFilter(null);
        setNewFixkosten({
          name: '',
          betrag: 0,
          rhythmus: 'monatlich',
          start: new Date(),
          enddatum: null,
          kategorie: 'Allgemein'
        });
        setEditingId(null);
        setEditingFixkosten(null);
        setSuccessMessage(null);
        showNotification(`Fehler: ${error}`, 'error', 10000);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // intentionally removing showNotification from dependencies
  
  // Apply filters when filter criteria change
  useEffect(() => {
    applyFilters(fixkosten);
  }, [showOnlyActive, rhythmusFilter, categoryFilter]);
  
  // Filter function
  const applyFilters = (data: Fixkosten[]) => {
    let filtered = data;
    
    // Apply active/inactive filter
    if (showOnlyActive) {
      filtered = filterActiveFixkosten(filtered, true);
    }
    
    // Apply rhythm filter
    if (rhythmusFilter.length > 0) {
      filtered = filtered.filter(item => rhythmusFilter.includes(item.rhythmus));
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filterFixkostenByCategory(filtered, categoryFilter);
    }
    
    // Sort by name
    filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    setFilteredFixkosten(filtered);
  };
  
  // Handle adding new fixed cost
  const handleAddFixkosten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    if (!newFixkosten.name || !newFixkosten.name.trim()) {
      setError('Bitte geben Sie eine Bezeichnung ein.');
      return;
    }
    
    if (newFixkosten.betrag === undefined || newFixkosten.betrag <= 0) {
      setError('Bitte geben Sie einen gültigen Betrag ein.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      showNotification('Speichere Fixkosten in Supabase...', 'loading');
      const result = await addFixkosten(
        newFixkosten.name ? newFixkosten.name.trim() : '',
        newFixkosten.betrag !== undefined ? newFixkosten.betrag : 0,
        newFixkosten.rhythmus || 'monatlich',
        newFixkosten.start || new Date(),
        newFixkosten.enddatum === undefined ? null : newFixkosten.enddatum,
        user.id,
        newFixkosten.kategorie || 'Allgemein'
      );
      
      setFixkosten([...fixkosten, result]);
      applyFilters([...fixkosten, result]);
      
      // Reset form
      setNewFixkosten({
        name: '',
        betrag: 0,
        rhythmus: 'monatlich',
        start: new Date(),
        enddatum: null,
        kategorie: 'Allgemein'
      });
      
      setSuccessMessage('Fixkosten erfolgreich hinzugefügt.');
      showNotification('Fixkosten erfolgreich in Supabase gespeichert', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Hinzufügen der Fixkosten.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle updating fixed cost
  const handleUpdateFixkosten = async (id: string, updates: Partial<Fixkosten>) => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      showNotification('Aktualisiere Fixkosten in Supabase...', 'loading');
      const result = await updateFixkostenById(id, updates, user.id);
      
      // Update state
      const updatedList = fixkosten.map(item => 
        item.id === id ? result : item
      );
      
      setFixkosten(updatedList);
      applyFilters(updatedList);
      setEditingId(null);
      setEditingFixkosten(null);
      
      setSuccessMessage('Fixkosten erfolgreich aktualisiert.');
      showNotification('Fixkosten erfolgreich in Supabase aktualisiert', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Aktualisieren der Fixkosten.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // New function to start editing
  const startEditing = (item: Fixkosten) => {
    setEditingId(item.id);
    setEditingFixkosten({...item});
  };

  // New function to cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditingFixkosten(null);
  };
  
  // Handle deleting fixed cost
  const handleDeleteFixkosten = async (id: string) => {
    if (!window.confirm('Möchten Sie diesen Fixkosten-Eintrag wirklich löschen? Dieser Vorgang wirkt sich direkt auf die Supabase-Datenbank aus.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      showNotification('Lösche Fixkosten aus Supabase...', 'loading');
      await deleteFixkostenById(id);
      
      // Update state
      const updatedList = fixkosten.filter(item => item.id !== id);
      setFixkosten(updatedList);
      applyFilters(updatedList);
      
      setSuccessMessage('Fixkosten erfolgreich gelöscht.');
      showNotification('Fixkosten erfolgreich aus Supabase gelöscht', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Löschen der Fixkosten.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle ending fixed cost (setting end date to today)
  const handleEndFixkosten = async (id: string) => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await updateFixkostenById(
        id, 
        { enddatum: new Date() },
        user.id
      );
      
      // Update state
      const updatedList = fixkosten.map(item => 
        item.id === id ? result : item
      );
      
      setFixkosten(updatedList);
      applyFilters(updatedList);
      
      setSuccessMessage('Fixkosten erfolgreich beendet.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Fehler beim Beenden der Fixkosten.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle reactivating fixed cost (removing end date)
  const handleReactivateFixkosten = async (id: string) => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await updateFixkostenById(
        id, 
        { enddatum: null },
        user.id
      );
      
      // Update state
      const updatedList = fixkosten.map(item => 
        item.id === id ? result : item
      );
      
      setFixkosten(updatedList);
      applyFilters(updatedList);
      
      setSuccessMessage('Fixkosten erfolgreich reaktiviert.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Fehler beim Reaktivieren der Fixkosten.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate display info for fixed cost
  const getFixkostenDisplayInfo = (item: Fixkosten) => {
    // Determine if active
    const isActive = isFixkostenActive(item);
    
    // Format for monthlyAmount based on rhythm
    let monthlyAmount = 0;
    switch(item.rhythmus) {
      case 'monatlich':
        monthlyAmount = item.betrag;
        break;
      case 'quartalsweise':
        monthlyAmount = item.betrag / 3;
        break;
      case 'halbjährlich':
        monthlyAmount = item.betrag / 6;
        break;
      case 'jährlich':
        monthlyAmount = item.betrag / 12;
        break;
    }
    
    // Get next date
    let nextDate = new Date(item.start);
    const today = new Date();
    
    // Keep advancing until we find a date in the future
    while (nextDate < today) {
      switch(item.rhythmus) {
        case 'monatlich':
          nextDate = addMonths(nextDate, 1);
          break;
        case 'quartalsweise':
          nextDate = addMonths(nextDate, 3);
          break;
        case 'halbjährlich':
          nextDate = addMonths(nextDate, 6);
          break;
        case 'jährlich':
          nextDate = addMonths(nextDate, 12);
          break;
      }
    }
    
    return {
      isActive,
      monthlyAmount,
      statusText: isActive 
        ? `Aktiv, nächste Zahlung: ${format(nextDate, 'dd.MM.yyyy')}`
        : `Beendet am: ${item.enddatum ? format(item.enddatum, 'dd.MM.yyyy') : 'unbekannt'}`
    };
  };
  
  // Add handleAddCategory function
  const handleAddCategory = () => {
    if (!newCategory || !newCategory.trim()) return;
    
    // Verify the category doesn't already exist
    if (categories.includes(newCategory.trim())) {
      alert('Diese Kategorie existiert bereits');
      return;
    }
    
    // Add the new category to the list
    setCategories([...categories, newCategory.trim()]);
    
    // Select the new category in the form
    setNewFixkosten({...newFixkosten, kategorie: newCategory.trim()});
    
    // Clear the input and hide the add form
    setNewCategory('');
    setShowAddCategory(false);
  };
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixkosten"
        subtitle="Wiederkehrende Ausgaben verwalten"
        actions={!isReadOnly ? (
          <button
            onClick={() => setShowFixkostenModal(true)}
            className="mt-4 w-full whitespace-nowrap rounded-md bg-[#CEFF65] px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm hover:bg-lime-200 dark:text-gray-900 sm:mt-0 sm:w-fit"
            disabled={loading}
          >
            + Fixkosten
          </button>
        ) : null}
      />
      
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
                <p>Sie haben nur Leserechte. Das Hinzufügen oder Bearbeiten von Fixkosten ist nicht möglich.</p>
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
      
      {/* Filter controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => setShowOnlyActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Nur aktive Fixkosten anzeigen</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rhythmus Filter
            </label>
            <div className="space-x-2">
              {['monatlich', 'quartalsweise', 'halbjährlich', 'jährlich'].map(rhythm => (
                <label key={rhythm} className="inline-flex items-center mr-3">
                  <input
                    type="checkbox"
                    checked={rhythmusFilter.includes(rhythm)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRhythmusFilter([...rhythmusFilter, rhythm]);
                      } else {
                        setRhythmusFilter(rhythmusFilter.filter(r => r !== rhythm));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-1 text-sm text-gray-700">{rhythm}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Kategorie
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle Kategorien</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fixkosten list (Tremor Table) */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Daten werden geladen...</p>
        </div>
      ) : filteredFixkosten.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">Keine Fixkosten gefunden.</p>
          {showOnlyActive && (
            <button 
              onClick={() => setShowOnlyActive(false)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Alle anzeigen (auch beendete)
            </button>
          )}
        </div>
      ) : (
        <TableRoot className="mt-2">
          <Table className="mt-4 hidden md:table">
            <TableHead>
              <TableRow className="border-b border-gray-200 dark:border-gray-800">
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Rhythmus</TableHeaderCell>
                <TableHeaderCell>Kategorie</TableHeaderCell>
                <TableHeaderCell className="text-right">Betrag</TableHeaderCell>
                <TableHeaderCell className="text-right">Monatlich</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Aktionen</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFixkosten.map((item) => {
                const { isActive, monthlyAmount, statusText } = getFixkostenDisplayInfo(item);
                return (
                  <TableRow key={item.id} className={`${isActive ? '' : 'bg-gray-50'} hover:bg-gray-50 dark:hover:bg-gray-900/40`}>
                    <TableCell className="text-gray-900 dark:text-gray-50 font-medium">{item.name}</TableCell>
                    <TableCell>{item.rhythmus}</TableCell>
                    <TableCell>{item.kategorie || 'Allgemein'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCHF(item.betrag)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCHF(monthlyAmount)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{statusText}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          onClick={() => startEditing(item)}
                          disabled={isReadOnly || loading}
                          className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Bearbeiten
                        </button>
                        {isActive ? (
                          <button
                            onClick={() => handleEndFixkosten(item.id)}
                            disabled={isReadOnly || loading}
                            className="text-yellow-600 hover:text-yellow-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Beenden
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateFixkosten(item.id)}
                            disabled={isReadOnly || loading}
                            className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Reaktivieren
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFixkosten(item.id)}
                          disabled={isReadOnly || loading}
                          className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Löschen
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {/* Simple mobile list */}
          <div className="md:hidden space-y-2">
            {filteredFixkosten.map((item) => {
              const { isActive, monthlyAmount, statusText } = getFixkostenDisplayInfo(item);
              return (
                <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-50">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.rhythmus} • {item.kategorie || 'Allgemein'}</div>
                      <div className="text-xs text-gray-500 mt-1">{statusText}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums">{formatCHF(item.betrag)}</div>
                      <div className="text-xs text-gray-500 tabular-nums">{formatCHF(monthlyAmount)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-3">
                    <button onClick={() => startEditing(item)} disabled={isReadOnly || loading} className="text-blue-600 text-xs">Bearbeiten</button>
                    {isActive ? (
                      <button onClick={() => handleEndFixkosten(item.id)} disabled={isReadOnly || loading} className="text-yellow-600 text-xs">Beenden</button>
                    ) : (
                      <button onClick={() => handleReactivateFixkosten(item.id)} disabled={isReadOnly || loading} className="text-green-600 text-xs">Reaktivieren</button>
                    )}
                    <button onClick={() => handleDeleteFixkosten(item.id)} disabled={isReadOnly || loading} className="text-red-600 text-xs">Löschen</button>
                  </div>
                </div>
              );
            })}
          </div>
        </TableRoot>
      )}
      
      {/* Neue Fixkosten Modal */}
      {showFixkostenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-3xl w-full mx-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-semibold mb-4">Neue Fixkosten hinzufügen</h2>
            
            <form onSubmit={(e) => {
              handleAddFixkosten(e);
              setShowFixkostenModal(false);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Bezeichnung
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={newFixkosten.name}
                    onChange={(e) => setNewFixkosten({...newFixkosten, name: e.target.value})}
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
                    type="number"
                    min="0"
                    step="0.01"
                    value={newFixkosten.betrag !== undefined ? newFixkosten.betrag : 0}
                    onChange={(e) => setNewFixkosten({...newFixkosten, betrag: parseFloat(e.target.value)})}
                    disabled={isReadOnly || loading}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="rhythmus" className="block text-sm font-medium text-gray-700 mb-1">
                    Rhythmus
                  </label>
                  <select
                    id="rhythmus"
                    value={newFixkosten.rhythmus || 'monatlich'}
                    onChange={(e) => setNewFixkosten({
                      ...newFixkosten, 
                      rhythmus: e.target.value as 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich'
                    })}
                    disabled={isReadOnly || loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="monatlich">monatlich</option>
                    <option value="quartalsweise">quartalsweise</option>
                    <option value="halbjährlich">halbjährlich</option>
                    <option value="jährlich">jährlich</option>
                  </select>
                </div>
              </div>
              
              {/* Category field */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kategorie" className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                    <span>Kategorie</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      {showAddCategory ? 'Abbrechen' : 'Neue Kategorie hinzufügen'}
                    </button>
                  </label>
                  
                  {showAddCategory ? (
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Neue Kategorie"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Hinzufügen
                      </button>
                    </div>
                  ) : (
                    <select
                      id="kategorie"
                      value={newFixkosten.kategorie || 'Allgemein'}
                      onChange={(e) => setNewFixkosten({...newFixkosten, kategorie: e.target.value})}
                      disabled={isReadOnly || loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Startdatum
                  </label>
                  <input
                    id="start_date"
                    type="date"
                    value={(newFixkosten.start || new Date()).toISOString().split('T')[0]}
                    onChange={(e) => setNewFixkosten({...newFixkosten, start: new Date(e.target.value)})}
                    disabled={isReadOnly || loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Enddatum (optional)
                  </label>
                  <input
                    id="end_date"
                    type="date"
                    value={newFixkosten.enddatum ? newFixkosten.enddatum.toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewFixkosten({
                      ...newFixkosten, 
                      enddatum: e.target.value ? new Date(e.target.value) : null
                    })}
                    disabled={isReadOnly || loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    // Reset form and close modal
                    setNewFixkosten({
                      name: '',
                      betrag: 0,
                      rhythmus: 'monatlich',
                      start: new Date(),
                      enddatum: null,
                      kategorie: 'Allgemein'
                    });
                    setShowFixkostenModal(false);
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wird gespeichert...' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit form modal */}
      {editingId && editingFixkosten && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Fixkosten bearbeiten</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingId && editingFixkosten) {
                handleUpdateFixkosten(editingId, editingFixkosten);
              }
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="edit_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Bezeichnung
                  </label>
                  <input
                    id="edit_name"
                    type="text"
                    value={editingFixkosten.name}
                    onChange={(e) => setEditingFixkosten({...editingFixkosten, name: e.target.value})}
                    disabled={loading}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Betrag (CHF)
                  </label>
                  <input
                    id="edit_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingFixkosten.betrag}
                    onChange={(e) => setEditingFixkosten({...editingFixkosten, betrag: parseFloat(e.target.value)})}
                    disabled={loading}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit_rhythmus" className="block text-sm font-medium text-gray-700 mb-1">
                    Rhythmus
                  </label>
                  <select
                    id="edit_rhythmus"
                    value={editingFixkosten.rhythmus}
                    onChange={(e) => setEditingFixkosten({
                      ...editingFixkosten, 
                      rhythmus: e.target.value as 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich'
                    })}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="monatlich">monatlich</option>
                    <option value="quartalsweise">quartalsweise</option>
                    <option value="halbjährlich">halbjährlich</option>
                    <option value="jährlich">jährlich</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label htmlFor="edit_start" className="block text-sm font-medium text-gray-700 mb-1">
                    Startdatum
                  </label>
                  <input
                    id="edit_start"
                    type="date"
                    value={editingFixkosten.start.toISOString().split('T')[0]}
                    onChange={(e) => setEditingFixkosten({...editingFixkosten, start: new Date(e.target.value)})}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit_end" className="block text-sm font-medium text-gray-700 mb-1">
                    Enddatum (optional)
                  </label>
                  <input
                    id="edit_end"
                    type="date"
                    value={editingFixkosten.enddatum ? editingFixkosten.enddatum.toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingFixkosten({
                      ...editingFixkosten, 
                      enddatum: e.target.value ? new Date(e.target.value) : null
                    })}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit_kategorie" className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <select
                    id="edit_kategorie"
                    value={editingFixkosten.kategorie || 'Allgemein'}
                    onChange={(e) => setEditingFixkosten({...editingFixkosten, kategorie: e.target.value})}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wird gespeichert...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 