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

  // Navigation links
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Planung', path: '/planung', icon: '📆' },
    { name: 'Analyse', path: '/analyse', icon: '📈' },
    { name: 'Datenimport', path: '/datenimport', icon: '📥' },
    { name: 'Transaktionen', path: '/transaktionen', icon: '✏️' },
    { name: 'Fixkosten', path: '/fixkosten', icon: '💸' },
    { name: 'Simulationen', path: '/simulationen', icon: '🔮' },
    { name: 'Simulation-Projektionen', path: '/simulation-projections', icon: '🧮' },
    { name: 'Mitarbeiter', path: '/mitarbeiter', icon: '👥' },
  ];
  
  // Admin links
  const adminLinks = [
    { name: 'Admin Panel', path: '/admin', icon: '⚙️' },
  ];

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

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Account Settings Section */}
      {isAuthenticated && user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Account</h3>
            <button className="text-xs text-blue-600 hover:text-blue-800">
              Settings
            </button>
          </div>
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
              <p className="text-xs text-gray-500">Current Balance</p>
            </div>
          )}
        </div>
      )}
      
      {/* Navigation Links */}
      <div className="flex-grow p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-600 mb-2 text-xs uppercase tracking-wider">Navigation</h3>
        <nav>
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link 
                  href={link.path}
                  className={`
                    flex items-center px-3 py-2 text-sm rounded-md
                    ${pathname === link.path 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {isAdmin && (
          <>
            <h3 className="font-semibold text-gray-600 mb-2 mt-6 text-xs uppercase tracking-wider">
              Administration
            </h3>
            <nav>
              <ul className="space-y-1">
                {adminLinks.map((link) => (
                  <li key={link.path}>
                    <Link 
                      href={link.path}
                      className={`
                        flex items-center px-3 py-2 text-sm rounded-md
                        ${pathname === link.path 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      <span className="mr-3">{link.icon}</span>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 text-xs text-gray-500 border-t border-gray-200">
        <p>© {new Date().getFullYear()} vaios</p>
        <p>Version 1.0.0</p>
      </div>
    </div>
  );
} 