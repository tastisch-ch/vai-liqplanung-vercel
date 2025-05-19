'use client';

import { useState, useEffect } from 'react';
import { Buchung, FixkostenOverride } from '@/models/types';
import { formatCHF } from '@/lib/currency';
import { formatSwissDate } from '@/lib/date-utils/format';
import { addFixkostenOverride, updateFixkostenOverrideById, deleteFixkostenOverrideById } from '@/lib/services/fixkosten-overrides';
import { useNotification } from '@/components/ui/Notification';

type OverrideModalProps = {
  transaction: Buchung;
  override: FixkostenOverride | null;
  existingOverrides: FixkostenOverride[];
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export default function OverrideModal({
  transaction,
  override,
  existingOverrides,
  userId,
  isOpen,
  onClose,
  onSave,
  onDelete
}: OverrideModalProps) {
  const { showNotification } = useNotification();
  
  // Extract fixkostenId from transaction ID (format: fixkosten_IDSTRING_DATE)
  const fixkostenId = transaction.id.split('_')[1];
  
  // State for form
  const [isSkipped, setIsSkipped] = useState(false);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [newAmount, setNewAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load existing override data if available
  useEffect(() => {
    if (override) {
      setIsSkipped(override.is_skipped);
      setNewDate(override.new_date);
      setNewAmount(override.new_amount);
      setNotes(override.notes || '');
    } else {
      // Default values for new override
      setIsSkipped(false);
      setNewDate(null);
      setNewAmount(null);
      setNotes('');
    }
  }, [override, isOpen]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    
    // Require at least one change
    if (!isSkipped && !newDate && newAmount === null) {
      setError('Bitte nehmen Sie mindestens eine Änderung vor (Datum, Betrag oder Überspringen).');
      setIsLoading(false);
      return;
    }
    
    try {
      if (override) {
        // Update existing override
        await updateFixkostenOverrideById(
          override.id,
          {
            is_skipped: isSkipped,
            new_date: newDate,
            new_amount: newAmount,
            notes: notes || null
          },
          userId
        );
        showNotification('Ausnahme wurde aktualisiert', 'success');
      } else {
        // Create new override
        await addFixkostenOverride(
          fixkostenId,
          transaction.date,
          newDate,
          newAmount,
          isSkipped,
          notes || null,
          userId
        );
        showNotification('Ausnahme wurde erstellt', 'success');
      }
      
      // Refresh data and close modal - ensure onSave completes before closing
      await onSave();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(`Fehler: ${errorMessage}`);
      showNotification(`Fehler: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete override
  const handleDelete = async () => {
    if (!override) return;
    
    if (!window.confirm('Möchten Sie diese Ausnahme wirklich löschen?')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (onDelete) {
        // Use parent component's delete handler if provided
        await onDelete(override.id);
        // Parent handler will handle notification, refresh, and closing
      } else {
        // Fallback to internal delete handling
        await deleteFixkostenOverrideById(override.id);
        showNotification('Ausnahme wurde gelöscht', 'success');
        await onSave();
        onClose();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(`Fehler beim Löschen: ${errorMessage}`);
      showNotification(`Fehler: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">
          {override ? 'Fixkosten-Ausnahme bearbeiten' : 'Neue Fixkosten-Ausnahme erstellen'}
        </h2>
        
        {/* Transaction info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Bezeichnung</div>
              <div className="font-medium">{transaction.details}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Datum</div>
              <div>{formatSwissDate(transaction.date)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Betrag</div>
              <div>{formatCHF(transaction.amount)}</div>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Skip checkbox */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isSkipped}
                onChange={(e) => setIsSkipped(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Diese Transaktion überspringen
              </span>
            </label>
          </div>
          
          {/* New date field */}
          <div className={isSkipped ? 'opacity-50' : ''}>
            <label htmlFor="new_date" className="block text-sm font-medium text-gray-700 mb-1">
              Neues Datum (optional)
            </label>
            <input
              id="new_date"
              type="date"
              value={newDate ? newDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setNewDate(e.target.value ? new Date(e.target.value) : null)}
              disabled={isSkipped || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* New amount field */}
          <div className={isSkipped ? 'opacity-50' : ''}>
            <label htmlFor="new_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Neuer Betrag (optional)
            </label>
            <input
              id="new_amount"
              type="number"
              step="0.01"
              min="0"
              value={newAmount !== null ? newAmount : ''}
              onChange={(e) => setNewAmount(e.target.value ? parseFloat(e.target.value) : null)}
              disabled={isSkipped || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Standard: ${formatCHF(transaction.amount)}`}
            />
          </div>
          
          {/* Notes field */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notizen (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Grund für diese Ausnahme"
            />
          </div>
          
          {/* Buttons */}
          <div className="flex justify-between pt-4">
            <div>
              {override && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md shadow-sm text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ausnahme löschen
                </button>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Wird gespeichert...' : (override ? 'Aktualisieren' : 'Speichern')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 