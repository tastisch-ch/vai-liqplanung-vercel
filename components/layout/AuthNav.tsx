'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Image from 'next/image';

interface AuthNavProps {
  onSidebarToggle?: () => void;
}

export default function AuthNav({ onSidebarToggle }: AuthNavProps) {
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
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200 py-3 mb-4 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          {/* Sidebar toggle button for mobile */}
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className="mr-4 md:hidden text-gray-700 hover:text-vaios-primary focus:outline-none"
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
          
          <Link href="/planung" className="flex items-center">
            <Image
              src="/assets/vaios-logo.svg"
              alt="vaios Logo"
              width={120}
              height={30}
              priority
            />
            <span className="ml-2 text-xl font-semibold text-vaios-primary">Liq-Planung</span>
          </Link>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          <Link 
            href="/datenimport" 
            className="px-3 py-2 rounded-md text-sm font-medium text-vaios-primary hover:bg-vaios-gray"
            title="Daten importieren"
          >
            <span className="hidden md:inline">Import</span>
            <svg className="md:hidden h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </Link>
          
          <button
            onClick={handleSignOut}
            className="px-3 py-2 rounded-md text-sm font-medium text-vaios-primary hover:bg-vaios-gray"
            disabled={isSigningOut}
          >
            <span className="hidden md:inline">Abmelden</span>
            <svg className="md:hidden h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
      
      {/* User info */}
      {isAuthenticated && user && (
        <div className="mt-2 container mx-auto flex items-center">
          <div className="bg-vaios-teal text-vaios-primary px-3 py-1 text-sm rounded-full">
            {user.email}
          </div>
          {isAdmin && (
            <div className="ml-2 bg-vaios-accent text-vaios-primary px-3 py-1 text-sm rounded-full">
              Administrator
            </div>
          )}
        </div>
      )}
    </nav>
  );
} 