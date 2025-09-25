'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatCHF, parseCHF } from '@/lib/currency';
import logger from '@/lib/logger';
import { getCurrentBalance, setCurrentBalance } from '@/lib/services/daily-balance';
import { User } from '@supabase/supabase-js';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export default function Sidebar() {
  const pathname = usePathname();
  const [isBalanceEditing, setIsBalanceEditing] = useState(false);
  
  // Use our logger hook
  const logError = (err: unknown, message?: string) => {
    logger.logError(err, message || 'Error in Sidebar', { 
      component: 'Sidebar' 
    });
  };
  
  // Access auth context
  const auth = useAuth();
  let isAuthenticated = false;
  let isAdmin = false;
  let isReadOnly = false;
  let user: User | null = null;
  
  try {
    isAuthenticated = auth.authState.isAuthenticated;
    isAdmin = !!auth.authState.isAdmin;
    isReadOnly = !!auth.authState.isReadOnly;
    user = auth.authState.user;
  } catch (error) {
    logError(error, 'Error accessing auth context');
  }

  // Define the type for navigation links
  type NavLink = {
    name: string;
    path: string;
    icon: 'dashboard' | 'calendar' | 'wallet' | 'users' | 'import' | 'settings';
    description: string;
  };

  // Core navigation links
  const navLinks: NavLink[] = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard', description: 'Übersicht' },
    { name: 'Planung', path: '/planung', icon: 'calendar', description: 'Finanzplanung' },
    { name: 'Fixkosten', path: '/fixkosten', icon: 'wallet', description: 'Fixkosten verwalten' },
    { name: 'Mitarbeiter', path: '/mitarbeiter', icon: 'users', description: 'Team verwalten' },
    { name: 'Datenimport', path: '/datenimport', icon: 'import', description: 'CSV/Excel importieren' },
  ];
  
  // Admin links
  const adminLinks: NavLink[] = [
    { name: 'Admin Panel', path: '/admin', icon: 'settings', description: 'Systemverwaltung' },
  ];

  // Kontostand functionality
  const [startBalance, setStartBalance] = useState(0);
  const [kontostandInput, setKontostandInput] = useState(formatCHF(0));
  const [kontostandError, setKontostandError] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load global balance
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoadingBalance(true);
        
        // Get the current global balance
        const currentBalance = await getCurrentBalance();
        setStartBalance(currentBalance.balance);
        setKontostandInput(formatCHF(currentBalance.balance));
        setLastUpdated(currentBalance.updated_at);
      } catch (error) {
        logError(error, 'Error loading global balance');
      } finally {
        setIsLoadingBalance(false);
      }
    }
    
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const updateKontostand = async () => {
    try {
      const parsedValue = parseCHF(kontostandInput);
      if (parsedValue !== null) {
        setIsLoadingBalance(true);
        // Save to database - using the global balance system
        const result = await setCurrentBalance(parsedValue);
        
        setStartBalance(result.balance);
        setKontostandInput(formatCHF(result.balance));
        setLastUpdated(result.updated_at);
        setKontostandError(false);
        setIsBalanceEditing(false);
        
        logger.info('Global Kontostand updated', { 
          value: result.balance, 
          component: 'Sidebar'
        });
      } else {
        throw new Error('Invalid amount');
      }
    } catch (error) {
      setKontostandError(true);
      setKontostandInput(formatCHF(startBalance));
      logError(error, 'Error updating global kontostand');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const renderLinks = (links: NavLink[]) => (
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.path}>
          <Link 
            href={link.path}
            className={`
              flex items-center px-3 py-2 text-sm rounded-md group
              ${pathname === link.path 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-100'}
            `}
          >
            <span className="mr-3 text-gray-600">{renderIcon(link.icon)}</span>
            <div>
              <div>{link.name}</div>
              <div className="text-xs text-gray-500 group-hover:text-gray-700">{link.description}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  function renderIcon(icon: NavLink['icon']) {
    switch (icon) {
      case 'dashboard':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>);
      case 'calendar':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
      case 'wallet':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V5a2 2 0 0 0-2-2H6"/></svg>);
      case 'users':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
      case 'import':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
      case 'settings':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 11 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 21 11.91H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
    }
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Account Settings Section */}
      {isAuthenticated && user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.email}
              </p>
              <p className="text-xs text-gray-500">
                {isAdmin ? 'Administrator' : 'Standard User'}
                {isReadOnly && ' (Nur Lesezugriff)'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Kontostand Section */}
      {isAuthenticated && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">💰 Kontostand</h3>
            {!isBalanceEditing && !isLoadingBalance && (
              <button 
                onClick={() => setIsBalanceEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={isReadOnly}
              >
                Aktualisieren
              </button>
            )}
          </div>
          
          {isBalanceEditing ? (
            <div className="mb-2">
              <input
                type="text"
                value={kontostandInput}
                onChange={(e) => setKontostandInput(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-right"
                disabled={isReadOnly}
                autoFocus
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={() => {
                    setIsBalanceEditing(false);
                    setKontostandInput(formatCHF(startBalance));
                  }}
                  className="px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={updateKontostand}
                  className="px-2 py-1 text-xs text-white bg-blue-600 rounded"
                  disabled={isReadOnly}
                >
                  Save
                </button>
              </div>
              {kontostandError && (
                <p className="mt-1 text-xs text-red-600">
                  Bitte gib einen gültigen Betrag ein
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded p-3">
              {isLoadingBalance ? (
                <div className="animate-pulse h-6 bg-gray-200 rounded"></div>
              ) : (
                <>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCHF(startBalance)}
                  </p>
                  <p className="text-xs text-gray-500">Aktueller Kontostand</p>
                  {lastUpdated && (
                    <p className="text-xs text-gray-400 mt-1">
                      Letzte Aktualisierung: {' '}
                      <span title={format(new Date(lastUpdated), 'dd.MM.yyyy HH:mm', { locale: de })}>
                        vor {formatDistanceToNow(new Date(lastUpdated), { locale: de })}
                      </span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-8">
          {/* Main Navigation */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Navigation
            </h3>
            {renderLinks(navLinks)}
          </div>
          
          {/* Admin Section */}
          {isAdmin && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Administration
              </h3>
              {renderLinks(adminLinks)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 