"use client";

import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useRef, useEffect } from "react";
import { useNotification } from "@/components/ui/Notification";
import { loadBuchungen } from "@/lib/services/buchungen";
import { Buchung } from "@/models/types";
import { format } from "date-fns";
import { formatCHF } from "@/lib/currency";
import * as XLSX from "xlsx";
import { authClient } from "@/lib/auth/client-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as Tooltip from "@radix-ui/react-tooltip";
import { supabase } from "@/lib/supabase/client";

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
  const [lastImport, setLastImport] = useState<{ date: string; user: string } | null>(null);

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

  // Load last import info from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('planning:last-import');
      if (raw) setLastImport(JSON.parse(raw));
    } catch {}
  }, []);

  // Load last import info from Supabase (global, persisted)
  useEffect(() => {
    let isMounted = true;
    const fetchLastImport = async () => {
      try {
        const { data, error } = await supabase
          .from('imports')
          .select('imported_at,user_email,user_id')
          .order('imported_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          const row = data[0] as any;
          const info = { date: row.imported_at, user: row.user_email || row.user_id || 'unknown' };
          if (isMounted) setLastImport(info);
        }
      } catch (_) {
        // ignore; best-effort display
      }
    };
    fetchLastImport();
    return () => { isMounted = false; };
  }, []);

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
      
      // Log match details if available
      if (result.matchDetails) {
        console.log('[CLIENT] Match details:', result.matchDetails);
        console.log(`[CLIENT] Matched: ${result.matchedCount || 0} out of ${result.count || 0} transactions`);
        result.matchDetails.forEach((detail: any) => {
          if (detail.matched) {
            console.log(`[CLIENT] ✓ Matched: "${detail.transaction}"`);
          } else {
            console.log(`[CLIENT] ✗ No match: "${detail.transaction}"${detail.error ? ` (Error: ${detail.error})` : ''}`);
            // Log debug logs if available
            if (detail.debugLogs && detail.debugLogs.length > 0) {
              console.log(`[CLIENT] Debug logs for "${detail.transaction}":`);
              detail.debugLogs.forEach((log: string) => console.log(`  ${log}`));
            }
          }
        });
      }
      
      if (result.success) {
        setImportSuccess({
          message: result.message || 'Import erfolgreich',
          count: result.count || 0
        });
        showNotification(`${result.count} Transaktionen erfolgreich importiert`, 'success');
        setHtmlInput('');
        // persist last import (date,user)
        try {
          const info = { date: new Date().toISOString(), user: user?.email || user?.id || 'unknown' };
          localStorage.setItem('planning:last-import', JSON.stringify(info));
          setLastImport(info);
        } catch {}
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

    // Check file size - serverless memory limits require small files
    const maxSize = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxSize) {
      const msg = `Excel-Datei zu groß: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 5MB). Bitte reduzieren Sie die Dateigröße oder teilen Sie sie in kleinere Dateien auf.`;
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
        try {
          const info = { date: new Date().toISOString(), user: user?.email || user?.id || 'unknown' };
          localStorage.setItem('planning:last-import', JSON.stringify(info));
          setLastImport(info);
        } catch {}
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
      <PageHeader
        title="Datenimport"
        subtitle="Bank-HTML und Rechnungen (Excel) importieren"
        actions={lastImport ? (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Letzter Import: {format(new Date(lastImport.date), 'dd.MM.yyyy HH:mm')} – {lastImport.user}
          </div>
        ) : null}
      />
      
      {/* Import Forms */}
      <Card className="shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Daten importieren</h2>
          <Tooltip.Provider delayDuration={100}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className="text-xs text-gray-500 cursor-help">Hilfe</span>
              </Tooltip.Trigger>
              <Tooltip.Content sideOffset={6} className="rounded-md border bg-white px-2 py-1 text-xs shadow-md text-gray-700">
                HTML: E‑Banking Tabelle einfügen. Excel: Rechnungen mit Spalten (Zahlbar bis, Kunde, Kundennummer, Brutto).
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        
        {/* Error Message */}
        {importError && (
          <div className="bg-red-50 p-3 rounded-md border border-red-200 mb-4">
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
          <div className="bg-green-50 p-3 rounded-md border border-green-200 mb-4">
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
          <div className="mb-3">
            <Label htmlFor="html-input" className="text-xs">HTML-Tabelle (E‑Banking, Ausgaben)</Label>
            <textarea
              id="html-input"
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              disabled={isImporting}
              placeholder="<table>...</table> hier einfügen"
              className="mt-2 w-full h-56 rounded-md border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 text-sm shadow-xs outline-hidden focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700/30"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isImporting || !htmlInput.trim()} className="bg-[#CEFF65] text-[#02403D] hover:bg-[#C2F95A] border border-[#CEFF65]">
              {isImporting ? 'Importiere…' : 'HTML importieren'}
            </Button>
          </div>
        </form>
        
        {/* Excel Import Form */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <Label htmlFor="excel-import" className="text-xs">Rechnungsdaten (Excel, Einnahmen)</Label>
          <div
            className={`mt-2 flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors ${isDragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-300 dark:border-gray-800'}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg className="mx-auto h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <label htmlFor="excel-import" className="relative cursor-pointer rounded-md bg-white dark:bg-gray-950 px-3 py-1.5 font-medium text-violet-700 hover:text-violet-800 focus-within:outline-hidden focus-within:ring-2 focus-within:ring-violet-300">
                <span>Datei auswählen</span>
                <input id="excel-import" name="excel-import" type="file" ref={fileInputRef} disabled={isImporting} accept=".xlsx,.xls" className="sr-only" onChange={handleExcelImport} />
              </label>
              <span>oder hierher ziehen</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">XLSX/XLS bis 10MB</p>
          </div>
        </div>
      </Card>
      
      {/* Removed "Vorhandene Daten" block as requested */}
    </div>
  );
} 