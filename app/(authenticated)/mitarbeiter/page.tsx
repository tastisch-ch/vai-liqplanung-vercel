'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import { Mitarbeiter, LohnDaten } from "@/models/types";
import { 
  loadMitarbeiter, 
  addMitarbeiter, 
  updateMitarbeiter, 
  deleteMitarbeiter,
  addLohnToMitarbeiter,
  updateLohn,
  deleteLohn,
  getAktuelleLohne
} from "@/lib/services/mitarbeiter";
import { formatCHF } from "@/lib/currency";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useNotification } from "@/components/ui/Notification";

export default function MitarbeiterPage() {
  const { authState } = useAuth();
  const { user, isReadOnly } = authState;
  const { showNotification } = useNotification();
  
  // State for employee list and UI
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // State for selected employee
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<Mitarbeiter | null>(null);
  const [showMitarbeiterForm, setShowMitarbeiterForm] = useState(false);
  
  // State for modal editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMitarbeiter, setEditingMitarbeiter] = useState<Mitarbeiter | null>(null);
  
  // State for salary management
  const [selectedLohn, setSelectedLohn] = useState<LohnDaten | null>(null);
  const [showLohnForm, setShowLohnForm] = useState(false);
  
  // State for modal salary editing
  const [editingLohnId, setEditingLohnId] = useState<string | null>(null);
  const [editingLohn, setEditingLohn] = useState<LohnDaten | null>(null);
  const [editingLohnMitarbeiter, setEditingLohnMitarbeiter] = useState<Mitarbeiter | null>(null);
  
  // Form states
  const [mitarbeiterForm, setMitarbeiterForm] = useState({
    name: ''
  });
  
  const [lohnForm, setLohnForm] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    betrag: 0,
    ende: ''
  });
  
  // Fetch employees data
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        showNotification('Lade Mitarbeiter aus Supabase...', 'loading');
        const data = await loadMitarbeiter(user.id);
        
        if (isMounted) {
        setMitarbeiter(data);
          showNotification(`${data.length} Mitarbeiter geladen`, 'success');
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
          setError('Fehler beim Laden der Mitarbeiter. Bitte versuchen Sie es später erneut.');
          showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
        setMitarbeiter([]);
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
  }, [user?.id]); // intentionally remove showNotification from dependencies
  
  // Handle form input changes for employee form
  const handleMitarbeiterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMitarbeiterForm({
      ...mitarbeiterForm,
      [name]: value
    });
  };
  
  // Handle form input changes for salary form
  const handleLohnInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLohnForm({
      ...lohnForm,
      [name]: name === 'betrag' ? parseFloat(value) || 0 : value
    });
  };
  
  // Reset employee form
  const resetMitarbeiterForm = (keepFormOpen = false) => {
    setMitarbeiterForm({ name: '' });
    setSelectedMitarbeiter(null);
    if (!keepFormOpen) {
      setShowMitarbeiterForm(false);
    }
  };
  
  // Reset salary form
  const resetLohnForm = (keepFormOpen = false) => {
    setLohnForm({
      start: format(new Date(), 'yyyy-MM-dd'),
      betrag: 0,
      ende: ''
    });
    setSelectedLohn(null);
    if (!keepFormOpen) {
      setShowLohnForm(false);
    }
  };
  
  // Set form for editing employee in modal
  const startEditing = (mitarbeiter: Mitarbeiter) => {
    setEditingId(mitarbeiter.id);
    setEditingMitarbeiter({...mitarbeiter});
  };

  // Cancel editing in modal
  const cancelEditing = () => {
    setEditingId(null);
    setEditingMitarbeiter(null);
  };
  
  // Set form for editing salary with modal
  const startEditingLohn = (mitarbeiter: Mitarbeiter, lohn: LohnDaten) => {
    console.log("Starting to edit lohn with modal", lohn);
    setEditingLohnId(lohn.id);
    setEditingLohn({...lohn});
    setEditingLohnMitarbeiter(mitarbeiter);
  };

  // Cancel editing salary in modal
  const cancelEditingLohn = () => {
    setEditingLohnId(null);
    setEditingLohn(null);
    setEditingLohnMitarbeiter(null);
  };
  
  // Set form for editing salary
  const prepareEditLohn = (lohn: LohnDaten) => {
    console.log("Preparing to edit lohn", lohn);
    // Set states in a consistent order
    setLohnForm({
      start: format(lohn.Start, 'yyyy-MM-dd'),
      betrag: lohn.Betrag,
      ende: lohn.Ende ? format(lohn.Ende, 'yyyy-MM-dd') : ''
    });
    setSelectedLohn(lohn);
    setShowLohnForm(true);
    console.log("Lohn form should be visible now");
  };
  
  // Helper to show the salary form with consistent state management
  const showSalaryForm = (employee: Mitarbeiter, salaryData: LohnDaten | null = null) => {
    console.log("Showing salary form for", employee.Name, salaryData ? "with existing data" : "for new entry");
    
    // First set which employee we're working with
    setSelectedMitarbeiter(employee);
    
    // Then set salary data if editing, or reset if creating new
    if (salaryData) {
      setLohnForm({
        start: format(salaryData.Start, 'yyyy-MM-dd'),
        betrag: salaryData.Betrag,
        ende: salaryData.Ende ? format(salaryData.Ende, 'yyyy-MM-dd') : ''
      });
      setSelectedLohn(salaryData);
    } else {
      setLohnForm({
        start: format(new Date(), 'yyyy-MM-dd'),
        betrag: 0,
        ende: ''
      });
      setSelectedLohn(null);
    }
    
    // Finally show the form
    setShowLohnForm(true);
  };
  
  // Handle adding/updating employee
  const handleSubmitMitarbeiter = async (e: React.FormEvent, isEditingModal = false) => {
    e.preventDefault();
    
    if (!user?.id) return;
    
    const name = isEditingModal && editingMitarbeiter 
      ? editingMitarbeiter.Name.trim()
      : mitarbeiterForm.name.trim();
    
    if (!name) {
      setError('Bitte geben Sie einen Namen ein.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (isEditingModal && editingMitarbeiter) {
        // Update using modal data
        showNotification('Aktualisiere Mitarbeiter in Supabase...', 'loading');
        const result = await updateMitarbeiter(
          editingMitarbeiter.id,
          { Name: name },
          user.id
        );
        
        // Update state
        const updatedList = mitarbeiter.map(item => 
          item.id === editingMitarbeiter.id ? result : item
        );
        
        setMitarbeiter(updatedList);
        setSuccessMessage('Mitarbeiter erfolgreich aktualisiert.');
        showNotification('Mitarbeiter erfolgreich aktualisiert', 'success');
        cancelEditing(); // Close the modal
      } else if (selectedMitarbeiter) {
        // Update using inline form data
        showNotification('Aktualisiere Mitarbeiter in Supabase...', 'loading');
        const result = await updateMitarbeiter(
          selectedMitarbeiter.id,
          { Name: name },
          user.id
        );
        
        // Update state
        const updatedList = mitarbeiter.map(item => 
          item.id === selectedMitarbeiter.id ? result : item
        );
        
        setMitarbeiter(updatedList);
        setSuccessMessage('Mitarbeiter erfolgreich aktualisiert.');
        showNotification('Mitarbeiter erfolgreich aktualisiert', 'success');
        resetMitarbeiterForm();
      } else {
        // Add new employee
        showNotification('Füge Mitarbeiter in Supabase hinzu...', 'loading');
        const result = await addMitarbeiter(
          name,
          [], // No initial salary data
          user.id
        );
        
        setMitarbeiter([...mitarbeiter, result]);
        setSuccessMessage('Mitarbeiter erfolgreich hinzugefügt.');
        showNotification('Mitarbeiter erfolgreich hinzugefügt', 'success');
        resetMitarbeiterForm();
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Speichern des Mitarbeiters.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding/updating salary
  const handleSubmitLohn = async (e: React.FormEvent, isEditingModal = false) => {
    e.preventDefault();
    console.log("Lohn form submitted", { selectedMitarbeiter, lohnForm, isEditingModal, editingLohn, editingLohnMitarbeiter });
    
    const mitarbeiterForEdit = isEditingModal ? editingLohnMitarbeiter : selectedMitarbeiter;
    
    if (!mitarbeiterForEdit) {
      console.error("No mitarbeiter selected when submitting lohn form");
      return;
    }
    
    const lohnData = isEditingModal && editingLohn
      ? {
          start: format(editingLohn.Start instanceof Date ? editingLohn.Start : new Date(editingLohn.Start), 'yyyy-MM-dd'),
          betrag: editingLohn.Betrag,
          ende: editingLohn.Ende ? format(editingLohn.Ende instanceof Date ? editingLohn.Ende : new Date(editingLohn.Ende), 'yyyy-MM-dd') : ''
        }
      : lohnForm;
    
    if (lohnData.betrag <= 0) {
      setError('Bitte geben Sie einen gültigen Betrag ein.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const startDate = new Date(lohnData.start);
      const endDate = lohnData.ende ? new Date(lohnData.ende) : null;
      console.log("Processing lohn data", { startDate, endDate, betrag: lohnData.betrag });
      
      let result: LohnDaten;
      const targetLohnId = isEditingModal && editingLohn ? editingLohn.id : selectedLohn?.id;
      
      if (targetLohnId) {
        // Update existing salary
        showNotification('Aktualisiere Lohndaten in Supabase...', 'loading');
        result = await updateLohn(
          targetLohnId,
          {
            Start: startDate,
            Ende: endDate,
            Betrag: lohnData.betrag
          }
        );
        
        // Update state
        const updatedMitarbeiter = mitarbeiter.map(ma => {
          if (ma.id === mitarbeiterForEdit.id) {
            return {
              ...ma,
              Lohn: ma.Lohn.map(lohn => 
                lohn.id === targetLohnId ? result : lohn
              )
            };
          }
          return ma;
        });
        
        setMitarbeiter(updatedMitarbeiter);
        setSuccessMessage('Lohndaten erfolgreich aktualisiert.');
        showNotification('Lohndaten erfolgreich aktualisiert', 'success');
      } else {
        // Add new salary
        showNotification('Füge Lohndaten in Supabase hinzu...', 'loading');
        result = await addLohnToMitarbeiter(
          mitarbeiterForEdit.id,
          startDate,
          lohnData.betrag,
          endDate
        );
        
        // Update state
        const updatedMitarbeiter = mitarbeiter.map(ma => {
          if (ma.id === mitarbeiterForEdit.id) {
            return {
              ...ma,
              Lohn: [...ma.Lohn, result]
            };
          }
          return ma;
        });
        
        setMitarbeiter(updatedMitarbeiter);
        setSuccessMessage('Lohndaten erfolgreich hinzugefügt.');
        showNotification('Lohndaten erfolgreich hinzugefügt', 'success');
      }
      
      // Reset form
      if (isEditingModal) {
        cancelEditingLohn();
      } else {
      resetLohnForm();
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Speichern der Lohndaten.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting employee
  const handleDeleteMitarbeiter = async (id: string) => {
    if (!window.confirm('Möchten Sie diesen Mitarbeiter wirklich löschen? Dieser Vorgang wirkt sich direkt auf die Supabase-Datenbank aus und löscht auch alle zugehörigen Lohndaten.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      showNotification('Lösche Mitarbeiter aus Supabase...', 'loading');
      await deleteMitarbeiter(id);
      
      // Update state
      const updatedList = mitarbeiter.filter(item => item.id !== id);
      setMitarbeiter(updatedList);
      
      setSuccessMessage('Mitarbeiter erfolgreich gelöscht.');
      showNotification('Mitarbeiter erfolgreich aus Supabase gelöscht', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Fehler beim Löschen des Mitarbeiters.');
      showNotification(`Fehler: ${errorMessage}`, 'error', 10000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting salary
  const handleDeleteLohn = async (id: string, mitarbeiterId: string) => {
    if (!window.confirm('Möchten Sie diesen Lohneintrag wirklich löschen?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await deleteLohn(id);
      
      // Update state
      const updatedMitarbeiter = mitarbeiter.map(ma => {
        if (ma.id === mitarbeiterId) {
          return {
            ...ma,
            Lohn: ma.Lohn.filter(lohn => lohn.id !== id)
          };
        }
        return ma;
      });
      
      setMitarbeiter(updatedMitarbeiter);
      setSuccessMessage('Lohndaten erfolgreich gelöscht.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Fehler beim Löschen der Lohndaten.');
    } finally {
      setLoading(false);
    }
  };
  
  // Monitor form visibility states
  useEffect(() => {
    console.log("showMitarbeiterForm changed to:", showMitarbeiterForm);
  }, [showMitarbeiterForm]);
  
  useEffect(() => {
    console.log("showLohnForm changed to:", showLohnForm, "selectedMitarbeiter:", selectedMitarbeiter?.Name);
  }, [showLohnForm, selectedMitarbeiter]);
  
  // Get current salaries for all employees
  const currentSalaries = getAktuelleLohne(mitarbeiter);

  // Debug readOnly state
  console.log("Auth state:", { user, isReadOnly, loading });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mitarbeiter-Verwaltung</h1>
      
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
                <p>Sie haben nur Leserechte. Das Hinzufügen oder Bearbeiten von Mitarbeitern ist nicht möglich.</p>
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
      
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Mitarbeiter ({mitarbeiter.length})</h2>
        </div>
        <button
          onClick={() => {
            console.log("Button clicked, current state:", showMitarbeiterForm);
            if (showMitarbeiterForm) {
              // If form is currently shown, hide it and reset
              setShowMitarbeiterForm(false);
              setMitarbeiterForm({ name: '' });
              setSelectedMitarbeiter(null);
            } else {
              // If form is hidden, show it
              setShowMitarbeiterForm(true);
              setMitarbeiterForm({ name: '' });
              setSelectedMitarbeiter(null);
            }
            console.log("New state will be:", !showMitarbeiterForm);
          }}
          disabled={isReadOnly || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showMitarbeiterForm ? 'Abbrechen' : 'Neuer Mitarbeiter'}
        </button>
      </div>
      
      {/* Employee Form */}
      {showMitarbeiterForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedMitarbeiter ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter anlegen'}
          </h2>
          
          <form onSubmit={(e) => handleSubmitMitarbeiter(e, false)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={mitarbeiterForm.name}
                onChange={handleMitarbeiterInputChange}
                disabled={isReadOnly || loading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isReadOnly || loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird gespeichert...' : selectedMitarbeiter ? 'Aktualisieren' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Salary Form */}
      {showLohnForm && selectedMitarbeiter && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedLohn ? 'Lohndaten bearbeiten' : 'Neue Lohndaten anlegen'} für {selectedMitarbeiter.Name}
          </h2>
          
          <form onSubmit={(e) => handleSubmitLohn(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
                  Startdatum
                </label>
                <input
                  id="start"
                  name="start"
                  type="date"
                  value={lohnForm.start}
                  onChange={handleLohnInputChange}
                  disabled={isReadOnly || loading}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="betrag" className="block text-sm font-medium text-gray-700 mb-1">
                  Lohn (CHF)
                </label>
                <input
                  id="betrag"
                  name="betrag"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lohnForm.betrag}
                  onChange={handleLohnInputChange}
                  disabled={isReadOnly || loading}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="ende" className="block text-sm font-medium text-gray-700 mb-1">
                  Enddatum (optional)
                </label>
                <input
                  id="ende"
                  name="ende"
                  type="date"
                  value={lohnForm.ende}
                  onChange={handleLohnInputChange}
                  disabled={isReadOnly || loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  console.log("Abbrechen button clicked");
                  resetLohnForm();
                }}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isReadOnly || loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird gespeichert...' : selectedLohn ? 'Aktualisieren' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Employees List */}
      {loading && mitarbeiter.length === 0 ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Daten werden geladen...</p>
        </div>
      ) : mitarbeiter.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center">
          <p className="text-gray-500">Keine Mitarbeiter gefunden.</p>
          <p className="mt-2 text-sm text-gray-500">
            Fügen Sie Mitarbeiter hinzu, um deren Löhne zu verwalten.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mitarbeiter.map((ma) => {
            // Find current salary
            const currentSalary = currentSalaries.find(item => item.mitarbeiter.id === ma.id)?.lohn;
            
            return (
              <div key={ma.id} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex flex-wrap justify-between items-start">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      {ma.Name}
                      {currentSalary && (
                        <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Aktueller Lohn: {formatCHF(currentSalary.Betrag)}
                        </span>
                      )}
                    </h3>
                    
                    <div className="flex mt-2 space-x-2">
                      <button
                        onClick={() => startEditing(ma)}
                        disabled={isReadOnly || loading}
                        className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDeleteMitarbeiter(ma.id)}
                        disabled={isReadOnly || loading}
                        className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      console.log("Lohn hinzufügen clicked for", ma.Name);
                      showSalaryForm(ma);
                    }}
                    disabled={isReadOnly || loading}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Lohn hinzufügen
                  </button>
                </div>
                
                {/* Salary History */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Lohnhistorie</h4>
                  
                  {ma.Lohn.length === 0 ? (
                    <p className="text-sm text-gray-500">Keine Lohndaten vorhanden.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Startdatum
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Enddatum
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Betrag
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Aktionen
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {ma.Lohn
                            .sort((a, b) => b.Start.getTime() - a.Start.getTime()) // Sort by start date, most recent first
                            .map((lohn) => (
                              <tr key={lohn.id}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {format(lohn.Start, 'dd.MM.yyyy')}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {lohn.Ende ? format(lohn.Ende, 'dd.MM.yyyy') : '-'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                  {formatCHF(lohn.Betrag)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => startEditingLohn(ma, lohn)}
                                    disabled={isReadOnly || loading}
                                    className="text-blue-600 hover:text-blue-800 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Bearbeiten
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLohn(lohn.id, ma.id)}
                                    disabled={isReadOnly || loading}
                                    className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Löschen
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Edit form modal */}
      {editingId && editingMitarbeiter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Mitarbeiter bearbeiten</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingId && editingMitarbeiter) {
                handleSubmitMitarbeiter(e, true);
              }
            }} className="space-y-4">
              <div>
                <label htmlFor="edit_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="edit_name"
                  type="text"
                  value={editingMitarbeiter.Name}
                  onChange={(e) => setEditingMitarbeiter({...editingMitarbeiter, Name: e.target.value})}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelEditing}
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
                  {loading ? 'Wird gespeichert...' : 'Aktualisieren'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Salary edit form modal */}
      {editingLohnId && editingLohn && editingLohnMitarbeiter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              Lohndaten bearbeiten für {editingLohnMitarbeiter.Name}
            </h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSubmitLohn(e, true);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="edit_lohn_start" className="block text-sm font-medium text-gray-700 mb-1">
                    Startdatum
                  </label>
                  <input
                    id="edit_lohn_start"
                    name="start"
                    type="date"
                    value={format(editingLohn.Start instanceof Date ? editingLohn.Start : new Date(editingLohn.Start), 'yyyy-MM-dd')}
                    onChange={(e) => setEditingLohn({
                      ...editingLohn,
                      Start: new Date(e.target.value)
                    })}
                    disabled={loading}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit_lohn_betrag" className="block text-sm font-medium text-gray-700 mb-1">
                    Lohn (CHF)
                  </label>
                  <input
                    id="edit_lohn_betrag"
                    name="betrag"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingLohn.Betrag}
                    onChange={(e) => setEditingLohn({
                      ...editingLohn,
                      Betrag: parseFloat(e.target.value) || 0
                    })}
                    disabled={loading}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit_lohn_ende" className="block text-sm font-medium text-gray-700 mb-1">
                    Enddatum (optional)
                  </label>
                  <input
                    id="edit_lohn_ende"
                    name="ende"
                    type="date"
                    value={editingLohn.Ende ? format(editingLohn.Ende instanceof Date ? editingLohn.Ende : new Date(editingLohn.Ende), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditingLohn({
                      ...editingLohn,
                      Ende: e.target.value ? new Date(e.target.value) : null
                    })}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelEditingLohn}
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
                  {loading ? 'Wird gespeichert...' : 'Aktualisieren'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 