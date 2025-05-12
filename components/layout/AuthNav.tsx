'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Image from 'next/image';

interface AuthNavProps {
  onSidebarToggle?: () => void;
}

export default function AuthNav({ onSidebarToggle }: AuthNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Get auth context first
  const auth = useAuth();
  
  // Then safely access properties with error handling
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  let isAuthenticated = false;
  let isAdmin = false;
  let user = null;
  let signOut = async () => {};
  
  try {
    isAuthenticated = auth.authState.isAuthenticated;
    isAdmin = !!auth.authState.isAdmin;
    user = auth.authState.user;
    signOut = auth.signOut;
  } catch (error) {
    if (error instanceof Error) {
      setAuthError(error.message);
    } else {
      setAuthError('Unknown error accessing auth context');
    }
  }

  // Handle sign out with redirect
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      
      // Redirect to login page after successful sign out
      router.push('/login');
      
      // Use a more forceful redirect after a short timeout if router.push doesn't work
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (error) {
      setIsSigningOut(false);
      console.error('Error signing out:', error);
    }
  };

  // Navigation items
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Planung', path: '/planung' },
    { name: 'Analyse', path: '/analyse' },
    { name: 'Transaktionen', path: '/transaktionen' },
    { name: 'Fixkosten', path: '/fixkosten' },
    { name: 'Simulationen', path: '/simulationen' },
    { name: 'Simulation-Projektionen', path: '/simulation-projections' },
    { name: 'Mitarbeiter', path: '/mitarbeiter' }
  ];

  // Navigation items for authenticated users (with visibility control)
  const navItems = navLinks.map(item => ({ 
    ...item, 
    showWhen: true 
  }));
  
  // Add admin link if needed
  if (isAdmin) {
    navItems.push({ name: 'Admin', path: '/admin', showWhen: true });
  }

  // Items to actually render
  const visibleNavItems = navItems.filter(item => item.showWhen);
  
  if (authError) {
    return (
      <nav className="bg-white border-b border-gray-200 py-3 mb-4">
        <div className="container mx-auto">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p>Auth Error: {authError}</p>
            <p>
              <Link href="/login" className="underline">
                Please try logging in again
              </Link>
            </p>
          </div>
        </div>
      </nav>
    );
  }
  
  // Show signing out indicator
  if (isSigningOut) {
    return (
      <nav className="bg-white border-b border-gray-200 py-3 mb-4">
        <div className="container mx-auto flex justify-center items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-gray-600">Abmelden...</p>
        </div>
      </nav>
    );
  }
  
  return (
    <nav className="bg-white border-b border-gray-200 py-3 mb-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          {/* Sidebar toggle button for mobile */}
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className="mr-4 md:hidden text-gray-700 hover:text-blue-500 focus:outline-none"
              aria-label="Toggle sidebar"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          
          <Link href="/dashboard" className="flex items-center mr-10">
            <Image
              src="/assets/vaios-logo.svg"
              alt="vaios Logo"
              width={120}
              height={30}
              priority
            />
            <span className="ml-2 text-xl font-semibold text-blue-600">Liq-Planung</span>
          </Link>
          
          <div className="hidden md:flex space-x-4">
            {visibleNavItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === item.path
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            <button
              onClick={handleSignOut}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              disabled={isSigningOut}
            >
              Abmelden
            </button>
          </div>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            className="text-gray-700 hover:text-blue-500 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
      
      {/* User info */}
      {isAuthenticated && user && (
        <div className="mt-2 container mx-auto flex items-center">
          <div className="bg-green-100 text-green-800 px-3 py-1 text-sm rounded-full">
            Angemeldet als: {user.email}
          </div>
          {isAdmin && (
            <div className="ml-2 bg-blue-100 text-blue-800 px-3 py-1 text-sm rounded-full">
              Administrator
            </div>
          )}
        </div>
      )}
    </nav>
  );
} 