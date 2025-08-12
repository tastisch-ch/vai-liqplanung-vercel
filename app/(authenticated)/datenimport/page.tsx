'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useRef, useEffect } from "react";
import { useNotification } from "@/components/ui/Notification";
import { loadBuchungen } from "@/lib/services/buchungen";
import { Buchung } from "@/models/types";
import { format } from "date-fns";
import { formatCHF } from "@/lib/currency";
import * as XLSX from 'xlsx';
import { authClient } from "@/lib/auth/client-auth";

export default function DatenImport() {
  const { authState, refreshAuth } = useAuth();
  const { user } = authState;
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [htmlInput, setHtmlInput] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<{message: string, count: number} | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [existingTransactions, setExistingTransactions] = useState<Buchung[]>([]);
  const [showExistingData, setShowExistingData] = useState<boolean>(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'incoming' | 'outgoing' | 'modified'>('all');
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(false);
  const [authDebug, setAuthDebug] = useState<string>('Checking auth status...');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Check authentication status on page load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Force client-side token refresh to ensure cookies are set
        if (authClient.supabase) {
          const { data } = await authClient.supabase.auth.getSession();
          if (data.session) {
            // Set cookies with multiple naming patterns to ensure compatibility
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`;
            document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=3600; SameSite=Lax`;
            
            // Also set with the correct project reference that Supabase is expecting
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const projectRef = supabaseUrl.match(/(?:\/\/|^)([\w-]+)\.supabase/)?.[1] || 'vstkbghqaslghqddzgph';
            
            document.cookie = `sb-${projectRef}-auth-token=${JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: Math.floor(Date.now() / 1000) + 3600
            })}; path=/; max-age=3600; SameSite=Lax`;
          }
        }
        
        // Fetch something from a test endpoint to check auth
        const res = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
        });
        
        const data = await res.json();
        setAuthDebug(`Auth status: ${res.status === 200 ? 'Authenticated' : 'Not authenticated'} - ${JSON.stringify(data)}`);
      } catch (error) {
        setAuthDebug(`Auth check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    if (user?.id) {
      checkAuth();
    } else {
      setAuthDebug('Not logged in');
    }
  }, [user]);

  // Manual auth refresh 
  const forceAuthRefresh = async () => {
    try {
      setAuthDebug('Refreshing auth session...');
      await refreshAuth();
      
      // Force client-side token refresh to ensure cookies are set
      if (authClient.supabase) {
        const { data } = await authClient.supabase.auth.getSession();
        if (data.session) {
          // Set cookies with multiple naming patterns to ensure compatibility
          document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`;
          document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=3600; SameSite=Lax`;
          
          // Also set with the correct project reference that Supabase is expecting
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.match(/(?:\/\/|^)([\w-]+)\.supabase/)?.[1] || 'vstkbghqaslghqddzgph';
          
          document.cookie = `sb-${projectRef}-auth-token=${JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          })}; path=/; max-age=3600; SameSite=Lax`;
          
          setAuthDebug(`Auth session refreshed with tokens. Access token: ${data.session.access_token.substring(0, 10)}...`);
        } else {
          setAuthDebug('No session found after refresh');
        }
      } else {
        setAuthDebug('Supabase client unavailable');
      }
    } catch (error) {
      setAuthDebug(`Refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to handle HTML import
  const handleHtmlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!htmlInput.trim()) {
      setImportError("Bitte fügen Sie HTML-Tabellendaten ein.");
      return;
    }

    if (!user?.id) {
      setImportError("Sie müssen angemeldet sein, um Daten zu importieren.");
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    
    try {
      showNotification('Importiere Transaktionen...', 'loading');
      
      // Refresh auth and set cookies before importing
      await forceAuthRefresh();
      
      // Create form data to send to the API
      const formData = new FormData();
      formData.append('type', 'html');
      formData.append('data', htmlInput);
      
      // Send the data to our API endpoint with credentials
      const response = await fetch('/api/buchungen/import', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Important for auth cookies
        headers: {
          // No Content-Type header, let the browser set it properly for FormData
        }
      });
      
      // Handle authentication error specifically
      if (response.status === 401) {
        showNotification('Authentifizierungsfehler: Bitte melden Sie sich erneut an', 'error');
        setImportError('Authentifizierungsfehler: Bitte melden Sie sich erneut an');
        
        // Add debug info
        const errorText = await response.text();
        setAuthDebug(`Auth error (401): ${errorText}`);
        return;
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Import fehlgeschlagen');
      }
      
      if (result.success) {
        setImportSuccess({
          message: result.message || 'Import erfolgreich',
          count: result.count || 0
        });
        showNotification(`${result.count} Transaktionen erfolgreich importiert`, 'success');
        setHtmlInput('');
      } else {
        setImportError('Keine Daten importiert. ' + (result.message || ''));
        showNotification('Keine Daten importiert', 'info');
      }
    } catch (error) {
      console.error("Import error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setImportError(`Fehler beim Import: ${errorMessage}`);
      showNotification(`Fehler: ${errorMessage}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Shared Excel import logic for file input and drag&drop
  const importExcelFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!user?.id) {
      setImportError('Sie müssen angemeldet sein, um Daten zu importieren.');
      return;
    }

    // Basic validation
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      const msg = 'Bitte eine Excel-Datei (.xlsx oder .xls) verwenden.';
      setImportError(msg);
      showNotification(msg, 'error');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      showNotification('Verarbeite Excel-Datei...', 'loading');

      // Refresh auth session before importing
      try {
        await refreshAuth();
        setAuthDebug('Auth session refreshed before import');
      } catch (authError) {
        console.error('Auth refresh error:', authError);
        setAuthDebug(`Auth refresh error: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
      }

      const formData = new FormData();
      formData.append('type', 'excel');
      formData.append('file', file);

      const response = await fetch('/api/buchungen/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.status === 401) {
        showNotification('Authentifizierungsfehler: Bitte melden Sie sich erneut an', 'error');
        setImportError('Authentifizierungsfehler: Bitte melden Sie sich erneut an');
        const errorText = await response.text();
        setAuthDebug(`Auth error (401): ${errorText}`);
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Import fehlgeschlagen');
      }

      if (result.success) {
        const count = result.count ?? result.stats?.newCount + result.stats?.updatedCount + result.stats?.removedCount ?? 0;
        setImportSuccess({ message: result.message || 'Import erfolgreich', count });
        showNotification(result.message || `Import erfolgreich (${count})`, 'success');
      } else {
        setImportError('Keine Daten importiert. ' + (result.message || ''));
        showNotification('Keine Daten importiert', 'info');
      }
    } catch (error) {
      console.error('Excel import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setImportError(`Fehler beim Excel-Import: ${errorMessage}`);
      showNotification(`Fehler: ${errorMessage}`, 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // File input change handler
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    await importExcelFile(file);
  };

  // Drag & Drop handlers
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    await importExcelFile(file);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  // Function to load existing transactions
  const loadExistingTransactions = async () => {
    if (!user?.id) return;
    
    setIsLoadingExisting(true);
    
    try {
      const transactions = await loadBuchungen(user.id);
      setExistingTransactions(transactions);
      setShowExistingData(true);
    } catch (error) {
      console.error("Error loading transactions:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      showNotification(`Fehler beim Laden existierender Transaktionen: ${errorMessage}`, 'error');
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // Filter existing transactions based on view filter
  const getFilteredTransactions = () => {
    if (existingTransactions.length === 0) return [];
    
    switch (viewFilter) {
      case 'incoming':
        return existingTransactions.filter(tx => tx.direction === 'Incoming');
      case 'outgoing':
        return existingTransactions.filter(tx => tx.direction === 'Outgoing');
      case 'modified':
        return existingTransactions.filter(tx => tx.modified);
      default:
        return existingTransactions;
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Datenimport</h1>
      
      {/* Auth Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 rounded-lg mb-4 text-xs font-mono">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold">Auth Debug</p>
            <button
              onClick={forceAuthRefresh}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Refresh Auth
            </button>
          </div>
          <p className="text-gray-800 break-all">
            {authDebug}
          </p>
          {user && (
            <div className="mt-2">
              <p>User ID: {user.id}</p>
              <p>Email: {user.email}</p>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="text-blue-800">
          ℹ️ Der Start-Kontostand kann über die Einstellungen verwaltet werden, unabhängig vom Datenimport.
        </p>
      </div>
      
      {/* Info/Help */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold mb-2">📋 Importanleitung</h2>
        <div className="prose prose-sm max-w-none">
          <h3>So importierst du deine Finanzdaten:</h3>
          <ol>
            <li>
              <strong>E-Banking-Daten</strong>: Kopiere die HTML-Tabelle aus deinem E-Banking und füge sie unten ein (für Ausgaben).
            </li>
            <li>
              <strong>Rechnungsdaten</strong> (optional): Lade Excel-Datei mit ausstehenden Rechnungen hoch (für Einnahmen).
            </li>
            <li>Klicke auf "Import starten".</li>
          </ol>
          <p><strong>Hinweis</strong>: Der Kontostand kann über die Einstellungen verwaltet werden.</p>
        </div>
      </div>
      
      {/* Import Forms */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Daten importieren</h2>
        
        {/* Error Message */}
        {importError && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  {importError}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {importSuccess && (
          <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {importSuccess.message} ({importSuccess.count} Datensätze)
          </p>
        </div>
            </div>
          </div>
        )}
        
        {/* HTML Import Form */}
        <form onSubmit={handleHtmlImport} className="mb-8">
          <div className="mb-4">
            <label htmlFor="html-input" className="block text-sm font-medium text-gray-700 mb-1">
              HTML-Tabelle aus E-Banking einfügen (Ausgaben):
            </label>
            <textarea
              id="html-input"
              value={htmlInput}
              onChange={e => setHtmlInput(e.target.value)}
              disabled={isImporting}
              placeholder="<table>...</table> aus dem E-Banking hier einfügen"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-64"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isImporting || !htmlInput.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importiere...' : 'HTML Import starten'}
            </button>
          </div>
        </form>
        
        {/* Excel Import Form */}
        <div className="border-t border-gray-200 pt-6">
          <label htmlFor="excel-import" className="block text-sm font-medium text-gray-700 mb-3">
            📄 Rechnungsdaten (Excel, Einnahmen):
          </label>
          
            <div
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              <div className="flex text-sm text-gray-600 justify-center">
                  <label
                  htmlFor="excel-import"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Datei hochladen</span>
                  <input
                    id="excel-import"
                    name="excel-import"
                    type="file"
                    ref={fileInputRef}
                    disabled={isImporting}
                    accept=".xlsx,.xls"
                    className="sr-only"
                    onChange={handleExcelImport}
                  />
                  </label>
                  <p className="pl-1">oder hierher ziehen</p>
              </div>
              <p className="text-xs text-gray-500">
                {isDragOver ? 'Datei fallen lassen zum Hochladen' : 'XLSX oder XLS bis zu 10MB'}
              </p>
            </div>
          </div>
          
          <p className="mt-2 text-sm text-gray-500">
            Die Excel-Datei sollte die Spalten "Zahlbar bis", "Kunde", "Kundennummer" und "Brutto" enthalten.
          </p>
        </div>
      </div>
      
      {/* Existing Transactions */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Vorhandene Daten</h2>
          <button
            onClick={loadExistingTransactions}
            disabled={isLoadingExisting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingExisting ? 'Lade Daten...' : 'Daten laden'}
          </button>
        </div>
        
        {!showExistingData ? (
          <p className="text-gray-500">Klicken Sie auf "Daten laden", um vorhandene Transaktionen anzuzeigen.</p>
        ) : (
          <>
            {existingTransactions.length === 0 ? (
              <p className="text-gray-500">Keine vorhandenen Transaktionen gefunden.</p>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewFilter('all')}
                      className={`px-3 py-1 text-sm rounded-md ${viewFilter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      Alle Buchungen
                    </button>
                    <button
                      onClick={() => setViewFilter('incoming')}
                      className={`px-3 py-1 text-sm rounded-md ${viewFilter === 'incoming' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      Nur Einnahmen
                    </button>
                    <button
                      onClick={() => setViewFilter('outgoing')}
                      className={`px-3 py-1 text-sm rounded-md ${viewFilter === 'outgoing' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      Nur Ausgaben
                    </button>
                    <button
                      onClick={() => setViewFilter('modified')}
                      className={`px-3 py-1 text-sm rounded-md ${viewFilter === 'modified' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      Modifiziert
                    </button>
                  </div>
                </div>
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
                          Betrag
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Konto
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategorie
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zahlbar bis
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kundenname
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kundennummer
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Brutto
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rückgängig
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredTransactions().map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {format(new Date(transaction.date), 'dd.MM.yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.details}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCHF(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(transaction as any).account || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.kategorie || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(transaction as any).dueDate ? format(new Date((transaction as any).dueDate), 'dd.MM.yyyy') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(transaction as any).customerName || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(transaction as any).customerNumber || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(transaction as any).grossAmount ? formatCHF((transaction as any).grossAmount) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(transaction as any).isReversed ? 'Ja' : 'Nein'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
} 