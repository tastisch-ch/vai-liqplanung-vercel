'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatCHF, parseCHF } from '@/lib/currency';
import logger from '@/lib/logger';

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
  let user = null;
  
  try {
    isAuthenticated = auth.authState.isAuthenticated;
    isAdmin = !!auth.authState.isAdmin;
    isReadOnly = !!auth.authState.isReadOnly;
    user = auth.authState.user;
  } catch (error) {
    logError(error, 'Error accessing auth context');
  }

  // Core navigation links
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊', description: 'Übersicht' },
    { name: 'Planung', path: '/planung', icon: '📆', description: 'Finanzplanung' },
    { name: 'Analyse', path: '/analyse', icon: '📈', description: 'Datenanalyse' },
  ];
  
  // Financial tools
  const financialTools = [
    { name: 'Transaktionen', path: '/transaktionen', icon: '✏️', description: 'Buchungen bearbeiten' },
    { name: 'Fixkosten', path: '/fixkosten', icon: '💸', description: 'Fixkosten verwalten' },
    { name: 'Simulationen', path: '/simulationen', icon: '🔮', description: 'Szenarien erstellen' },
  ];
  
  // Additional tools
  const additionalTools = [
    { name: 'Datenimport', path: '/datenimport', icon: '📥', description: 'CSV/Excel importieren' },
    { name: 'Mitarbeiter', path: '/mitarbeiter', icon: '👥', description: 'Team verwalten' },
    { name: 'Projektionen', path: '/simulation-projections', icon: '🧮', description: 'Prognosen' },
  ];
  
  // Admin links
  const adminLinks = [
    { name: 'Admin Panel', path: '/admin', icon: '⚙️', description: 'Systemverwaltung' },
  ];

  // Define the type for navigation links
  type NavLink = {
    name: string;
    path: string;
    icon: string;
    description: string;
  };

  // Kontostand functionality
  const [startBalance, setStartBalance] = useState(0);
  const [kontostandInput, setKontostandInput] = useState(formatCHF(0));
  const [kontostandError, setKontostandError] = useState(false);

  const updateKontostand = () => {
    try {
      const parsedValue = parseCHF(kontostandInput);
      if (parsedValue !== null) {
        setStartBalance(parsedValue);
        setKontostandInput(formatCHF(parsedValue));
        setKontostandError(false);
        setIsBalanceEditing(false);
        // In a real app, save to database or context here
        logger.info('Kontostand updated', { 
          value: parsedValue, 
          component: 'Sidebar'
        });
      } else {
        throw new Error('Invalid amount');
      }
    } catch (error) {
      setKontostandError(true);
      setKontostandInput(formatCHF(startBalance));
      logError(error, 'Error updating kontostand');
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
            <span className="mr-3 text-lg">{link.icon}</span>
            <div>
              <div>{link.name}</div>
              <div className="text-xs text-gray-500 group-hover:text-gray-700">{link.description}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

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
            {!isBalanceEditing && (
              <button 
                onClick={() => setIsBalanceEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={isReadOnly}
              >
                Edit
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
                  onClick={() => setIsBalanceEditing(false)}
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
              <p className="text-xl font-bold text-gray-900">
                {formatCHF(startBalance)}
              </p>
              <p className="text-xs text-gray-500">Aktueller Kontostand</p>
            </div>
          )}
        </div>
      )}
      
      {/* Navigation Links */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-600 mb-2 text-xs uppercase tracking-wider">Hauptnavigation</h3>
            {renderLinks(navLinks)}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-600 mb-2 text-xs uppercase tracking-wider">Finanzverwaltung</h3>
            {renderLinks(financialTools)}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-600 mb-2 text-xs uppercase tracking-wider">Werkzeuge</h3>
            {renderLinks(additionalTools)}
          </div>
          
          {isAdmin && (
            <div>
              <h3 className="font-semibold text-gray-600 mb-2 text-xs uppercase tracking-wider">Administration</h3>
              {renderLinks(adminLinks)}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 text-xs text-gray-500 border-t border-gray-200">
        <p>© {new Date().getFullYear()} vaios</p>
        <p>Version 1.0.0</p>
      </div>
    </div>
  );
} 