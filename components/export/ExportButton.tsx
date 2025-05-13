'use client';

import { useState, useEffect } from 'react';
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get authentication tokens on component mount
  useEffect(() => {
    // Try to extract tokens from local storage
    try {
      const supabaseKey = Object.keys(localStorage).find(key => 
        key.startsWith('sb-') && key.endsWith('-auth-token')
      );
      
      if (supabaseKey) {
        const authData = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
        if (authData.access_token && authData.refresh_token) {
          setAccessToken(authData.access_token);
          setRefreshToken(authData.refresh_token);
          
          // Set these as cookies to help with API authentication
          document.cookie = `sb-access-token=${authData.access_token}; path=/; max-age=3600; SameSite=Strict`;
          document.cookie = `sb-refresh-token=${authData.refresh_token}; path=/; max-age=3600; SameSite=Strict`;
          
          // Try to extract user ID from the JWT token
          try {
            const parts = authData.access_token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.sub) {
                setUserId(payload.sub);
                console.log('User ID extracted from token:', payload.sub);
              }
            }
          } catch (e) {
            console.error('Error extracting user ID from token:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error extracting auth tokens:', e);
    }
  }, []);
  
  // Map type to API endpoint and German label
  const typeMap = {
    transactions: { endpoint: 'transactions', label: 'Transaktionen' },
    fixkosten: { endpoint: 'fixkosten', label: 'Fixkosten' },
    mitarbeiter: { endpoint: 'mitarbeiter', label: 'Mitarbeiter' },
    simulationen: { endpoint: 'simulationen', label: 'Simulationen' }
  };

  // Handle CSV export
  const handleExport = async (format: 'csv') => {
    if (!authState.isAuthenticated) {
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
      
      // Direct download approach - more reliable across browsers
      if (accessToken) {
        url += `&access_token=${encodeURIComponent(accessToken)}`;
        
        if (refreshToken) {
          url += `&refresh_token=${encodeURIComponent(refreshToken)}`;
        }
        
        if (userId) {
          url += `&test_user_id=${encodeURIComponent(userId)}`;
        }
        
        console.log('Opening download URL with auth tokens');
        window.open(url, '_blank');
        showNotification(`${typeMap[type].label} erfolgreich exportiert`, 'success');
        setIsExporting(false);
        return;
      }
      
      // Fetch approach as fallback
      const headers: Record<string, string> = {
        'Accept': 'text/csv',
        'Cache-Control': 'no-cache'
      };
      
      // Make a fetch request instead of window.open to check for errors
      const response = await fetch(url, {
        credentials: 'include', // Important! Include cookies for authentication
        headers
      });
      
      if (!response.ok) {
        // If we got a 401, show a better error
        if (response.status === 401) {
          throw new Error('Authentifizierungsfehler. Bitte neu anmelden und erneut versuchen.');
        }
        
        // Otherwise handle the error
        let errorMessage = 'Fehler beim Export';
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || 'Unbekannter Fehler';
        } catch {
          // If we can't parse the JSON, use the status text
          errorMessage = `Fehler: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 
                     `${typeMap[type].endpoint}_export.${format}`;
      
      link.download = filename;
      
      // Append the link to the document, click it, and remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(downloadUrl);
      
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