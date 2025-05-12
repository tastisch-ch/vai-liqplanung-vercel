'use client';

import { useState, useEffect } from 'react';
import AuthNav from './AuthNav';
import PublicNav from './PublicNav';
import { authClient } from '@/lib/auth/client-auth';

export default function ConditionalNav() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authClient.getCurrentUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading state 
  if (isLoading) {
    return (
      <nav className="bg-white border-b border-gray-200 py-3 mb-4">
        <div className="container mx-auto">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-slate-200 h-10 w-24"></div>
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Return the appropriate nav component based on auth state
  return isAuthenticated ? <AuthNav /> : <PublicNav />;
} 