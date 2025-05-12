'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import type { Simulation } from "@/models/types";
import { 
  loadSimulationen, 
  addSimulation, 
  updateSimulationById, 
  deleteSimulationById,
  generateSimulationProjections 
} from "@/lib/services/simulationen";
import { formatCHF } from "@/lib/currency";
import { format, isBefore, isAfter, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import { parseISO } from "date-fns";
import { formatSwissDate } from "@/lib/date-utils/format";
import { useNotification } from "@/components/ui/Notification";

export default function Simulationen() {
  const { authState } = useAuth();
  const { user, isReadOnly } = authState;
  const { showNotification } = useNotification();
  
  // State for simulations list and filtering
  const [simulationen, setSimulationen] = useState<Simulation[]>([]);
  const [projections, setProjections] = useState<Array<Simulation & { date: Date }>>([]);
  const [filteredSimulationen, setFilteredSimulationen] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('upcoming');
  const [showRecurringOnly, setShowRecurringOnly] = useState<boolean>(false);
  
  // State for creating/editing simulation
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filter state
  const [searchText, setSearchText] = useState('');
  
  // Projection period (default: 12 months from now)
  const [projectionStart] = useState<Date>(new Date());
  const [projectionEnd, setProjectionEnd] = useState<Date>(() => {
    const end = new Date();
    end.setMonth(end.getMonth() + 12);
    return end;
  });
  
  // Selected simulation
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [showSimulationForm, setShowSimulationForm] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    details: '',
    date: formatDate(new Date()),
    amount: 0,
    direction: 'Outgoing' as 'Incoming' | 'Outgoing',
    recurring: false,
    interval: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    end_date: ''
  });
  
  // Fetch simulations data
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        showNotification('Lade Simulationen aus Supabase...', 'loading');
        const data = await loadSimulationen(user.id);
        
        if (isMounted) {
          setSimulationen(data);
          showNotification(`${data.length} Simulationen geladen`, 'success');
          
          // Generate projections
          const projected = generateSimulationProjections(data, projectionStart, projectionEnd);
          setProjections(projected);
          
          applyFilters(data);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
          setError('Fehler beim Laden der Simulationen. Bitte versuchen Sie es später erneut.');
          showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
          setSimulationen([]);
          setProjections([]);
          setFilteredSimulationen([]);
        }
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
  }, [user?.id, projectionStart, projectionEnd]); // intentionally remove showNotification from dependencies
  
  // Apply filters when filter criteria change
  useEffect(() => {
    applyFilters(simulationen);
  }, [directionFilter, timeFilter, showRecurringOnly]);
  
  // Filter function
  const applyFilters = (data: Simulation[]) => {
    let filtered = [...data];
    const today = new Date();
    
    // Apply direction filter
    if (directionFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.direction === directionFilter
      );
    }
    
    // Apply time filter
    if (timeFilter === 'upcoming') {
      filtered = filtered.filter(item => 
        isAfter(item.date, today) || 
        (item.recurring && (!item.end_date || isAfter(item.end_date, today)))
      );
    } else if (timeFilter === 'past') {
      filtered = filtered.filter(item => 
        isBefore(item.date, today) && 
        (!item.recurring || (item.recurring && item.end_date && isBefore(item.end_date, today)))
      );
    }
    
    // Apply recurring filter
    if (showRecurringOnly) {
      filtered = filtered.filter(item => item.recurring);
    }
    
    // Sort by date
    filtered = filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    setFilteredSimulationen(filtered);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm({
        ...form,
        [name]: checked,
      });
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      setForm({
        ...form,
        [name]: parseFloat(value) || 0,
      });
      return;
    }
    
    // Handle other inputs
    setForm({
      ...form,
      [name]: value,
    });
  };
  
  // Reset form to default values
  const resetForm = () => {
    setForm({
      name: '',
      details: '',
      date: formatDate(new Date()),
      amount: 0,
      direction: 'Outgoing',
      recurring: false,
      interval: 'monthly',
      end_date: ''
    });
    setFormMode('add');
    setEditingId(null);
  };
  
  // Set form data for editing
  const prepareFormForEdit = (simulation: Simulation) => {
    setForm({
      name: simulation.name,
      details: simulation.details || '',
      date: formatDate(simulation.date),
      amount: simulation.amount,
      direction: simulation.direction,
      recurring: simulation.recurring || false,
      interval: simulation.interval || 'monthly',
      end_date: simulation.end_date ? formatDate(simulation.end_date) : ''
    });
    setFormMode('edit');
    setEditingId(simulation.id);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;
    
    if (!form.name.trim()) {
      setError('Bitte geben Sie einen Namen ein.');
      return;
    }
    
    if (form.amount <= 0) {
      setError('Bitte geben Sie einen gültigen Betrag ein.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      showNotification('Speichere Simulation in Supabase...', 'loading');
      const dateObj = parseISO(form.date);
      const endDateObj = form.end_date ? parseISO(form.end_date) : null;
      
      // Create or update simulation
      if (formMode === 'add') {
        const result = await addSimulation(
          form.name.trim(),
          form.details.trim(),
          dateObj,
          form.amount,
          form.direction,
          user.id,
          form.recurring,
          form.recurring ? form.interval : undefined,
          endDateObj
        );
        
        setSimulationen([...simulationen, result]);
        applyFilters([...simulationen, result]);
        setSuccessMessage('Simulation erfolgreich erstellt.');
        showNotification('Simulation erfolgreich in Supabase gespeichert', 'success');
      } else if (formMode === 'edit' && editingId) {
        const result = await updateSimulationById(
          editingId,
          {
            name: form.name.trim(),
            details: form.details.trim(),
            date: dateObj,
            amount: form.amount,
            direction: form.direction,
            recurring: form.recurring,
            interval: form.recurring ? form.interval : undefined,
            end_date: endDateObj
          },
          user.id
        );
        
        const updatedList = simulationen.map(item => 
          item.id === editingId ? result : item
        );
        
        setSimulationen(updatedList);
        applyFilters(updatedList);
        setSuccessMessage('Simulation erfolgreich aktualisiert.');
        showNotification('Simulation erfolgreich in Supabase aktualisiert', 'success');
      }
      
      // Reset form
      resetForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Speichern der Simulation.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting simulation
  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Simulation wirklich löschen? Dieser Vorgang wirkt sich direkt auf die Supabase-Datenbank aus.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      showNotification('Lösche Simulation aus Supabase...', 'loading');
      await deleteSimulationById(id);
      
      // Update state
      const updatedList = simulationen.filter(item => item.id !== id);
      setSimulationen(updatedList);
      applyFilters(updatedList);
      
      setSuccessMessage('Simulation erfolgreich gelöscht.');
      showNotification('Simulation erfolgreich aus Supabase gelöscht', 'success');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Löschen der Simulation.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Get descriptive text for a simulation
  const getSimulationInfo = (simulation: Simulation) => {
    const dateStr = format(simulation.date, 'dd.MM.yyyy');
    
    let typeStr = '';
    if (simulation.recurring) {
      const intervalMap: Record<string, string> = {
        'monthly': 'monatlich',
        'quarterly': 'quartalsweise',
        'yearly': 'jährlich'
      };
      
      typeStr = `, ${intervalMap[simulation.interval || 'monthly']} wiederkehrend`;
      
      if (simulation.end_date) {
        typeStr += ` bis ${format(simulation.end_date, 'dd.MM.yyyy')}`;
      }
    }
    
    const directionStr = simulation.direction === 'Incoming' ? 'Einnahme' : 'Ausgabe';
    
    return `${dateStr}${typeStr} | ${directionStr}`;
  };

  // Helper to format date for form input
  function formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }

  // Filter simulations
  const filteredSimulations = simulationen.filter(sim => {
    if (searchText && !sim.name.toLowerCase().includes(searchText.toLowerCase()) && 
        !sim.details.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    if (showRecurringOnly && !sim.recurring) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finanzielle Simulationen</h1>
      
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
                <p>Sie haben nur Leserechte. Das Hinzufügen oder Bearbeiten von Simulationen ist nicht möglich.</p>
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
      
      {/* Add/Edit Simulation Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {formMode === 'add' ? 'Neue Simulation erstellen' : 'Simulation bearbeiten'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Bezeichnung
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
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
                value={form.amount}
                onChange={handleInputChange}
                disabled={isReadOnly || loading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
              Details
            </label>
            <textarea
              id="details"
              name="details"
              rows={2}
              value={form.details}
              onChange={handleInputChange}
              disabled={isReadOnly || loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Datum
              </label>
              <input
                id="date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleInputChange}
                disabled={isReadOnly || loading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="direction" className="block text-sm font-medium text-gray-700 mb-1">
                Richtung
              </label>
              <select
                id="direction"
                name="direction"
                value={form.direction}
                onChange={handleInputChange}
                disabled={isReadOnly || loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Incoming">Einnahme</option>
                <option value="Outgoing">Ausgabe</option>
              </select>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center mb-3">
              <input
                id="recurring"
                name="recurring"
                type="checkbox"
                checked={form.recurring}
                onChange={handleInputChange}
                disabled={isReadOnly || loading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="recurring" className="ml-2 block text-sm font-medium text-gray-700">
                Wiederkehrende Simulation
              </label>
            </div>
            
            {form.recurring && (
              <div className="ml-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-1">
                      Intervall
                    </label>
                    <select
                      id="interval"
                      name="interval"
                      value={form.interval}
                      onChange={handleInputChange}
                      disabled={isReadOnly || loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="monthly">Monatlich</option>
                      <option value="quarterly">Quartalsweise</option>
                      <option value="yearly">Jährlich</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Enddatum (optional)
                    </label>
                    <input
                      id="end_date"
                      name="end_date"
                      type="date"
                      value={form.end_date}
                      onChange={handleInputChange}
                      disabled={isReadOnly || loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            {formMode === 'edit' && (
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Abbrechen
              </button>
            )}
            
            <button
              type="submit"
              disabled={isReadOnly || loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird gespeichert...' : formMode === 'add' ? 'Hinzufügen' : 'Aktualisieren'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Filter controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="directionFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Richtung
            </label>
            <select
              id="directionFilter"
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md shadow-sm px-3 py-1"
            >
              <option value="all">Alle</option>
              <option value="Incoming">Einnahmen</option>
              <option value="Outgoing">Ausgaben</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="timeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Zeitraum
            </label>
            <select
              id="timeFilter"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md shadow-sm px-3 py-1"
            >
              <option value="all">Alle</option>
              <option value="upcoming">Zukünftig</option>
              <option value="past">Vergangen</option>
            </select>
          </div>
          
          <div className="flex items-center ml-4 mt-6">
            <input
              id="recurringFilter"
              type="checkbox"
              checked={showRecurringOnly}
              onChange={(e) => setShowRecurringOnly(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="recurringFilter" className="ml-2 block text-sm font-medium text-gray-700">
              Nur wiederkehrende
            </label>
          </div>
        </div>
      </div>
      
      {/* Simulations List */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Simulationen</h2>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Daten werden geladen...</p>
          </div>
        ) : filteredSimulationen.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Keine Simulationen gefunden.</p>
            <p className="mt-2 text-sm text-gray-500">
              Erstellen Sie eine neue Simulation um finanzielle Szenarien zu planen.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {filteredSimulationen.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex flex-wrap justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="mr-3">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          item.direction === 'Incoming' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {item.direction === 'Incoming' ? '+' : '-'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {item.name}
                          {item.recurring && (
                            <span className="ml-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              Wiederkehrend
                            </span>
                          )}
                        </h3>
                        <div className="mt-1 text-sm text-gray-500">
                          {getSimulationInfo(item)}
                        </div>
                        {item.details && (
                          <div className="mt-1 text-sm text-gray-600">
                            {item.details}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 ml-4">
                    <div className={`text-lg font-semibold ${
                      item.direction === 'Incoming' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCHF(item.amount)}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 ml-4">
                      <button
                        onClick={() => prepareFormForEdit(item)}
                        disabled={isReadOnly || loading}
                        className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Bearbeiten
                      </button>
                      
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isReadOnly || loading}
                        className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 