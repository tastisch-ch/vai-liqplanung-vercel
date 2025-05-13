'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNotification } from '@/components/ui/Notification';

interface ExportButtonProps {
  type: 'transactions' | 'fixkosten' | 'mitarbeiter' | 'simulationen';
  className?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  active?: boolean;
}

export default function ExportButton({ type, className, dateRange, active }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { authState } = useAuth();
  const { showNotification } = useNotification();
  
  // Map type to API endpoint and German label
  const typeMap = {
    transactions: { endpoint: 'transactions', label: 'Transaktionen' },
    fixkosten: { endpoint: 'fixkosten', label: 'Fixkosten' },
    mitarbeiter: { endpoint: 'mitarbeiter', label: 'Mitarbeiter' },
    simulationen: { endpoint: 'simulationen', label: 'Simulationen' }
  };

  // Handle CSV export
  const handleExport = async (format: 'csv') => {
    if (!authState.is_authenticated) {
      showNotification('Sie müssen angemeldet sein, um Daten zu exportieren', 'error');
      return;
    }

    setIsExporting(true);
    setShowDropdown(false);
    
    try {
      showNotification(`${typeMap[type].label} werden exportiert...`, 'loading');
      
      // Build URL with parameters
      let url = `/api/export/${typeMap[type].endpoint}?format=${format}`;
      
      // Add date range if provided
      if (dateRange?.from) {
        url += `&from=${dateRange.from.toISOString().split('T')[0]}`;
      }
      
      if (dateRange?.to) {
        url += `&to=${dateRange.to.toISOString().split('T')[0]}`;
      }
      
      // Add active filter if provided
      if (active !== undefined) {
        url += `&active=${active}`;
      }
      
      // Use window.open to trigger file download
      window.open(url, '_blank');
      
      showNotification(`${typeMap[type].label} erfolgreich exportiert`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification(`Fehler beim Export: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle dropdown toggle
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className={`inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isExporting ? 'opacity-50 cursor-not-allowed' : ''
          } ${className || ''}`}
          disabled={isExporting}
          onClick={toggleDropdown}
        >
          <svg 
            className="w-4 h-4 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          Exportieren
          <svg 
            className="w-4 h-4 ml-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {showDropdown && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              role="menuitem"
            >
              Als CSV exportieren
            </button>
            <button
              disabled
              className="w-full text-left block px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
              role="menuitem"
            >
              Als Excel exportieren (demnächst)
            </button>
            <button
              disabled
              className="w-full text-left block px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
              role="menuitem"
            >
              Als PDF exportieren (demnächst)
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 