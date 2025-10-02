'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import logger from '@/lib/logger';
import { RiEyeLine, RiEyeOffLine } from '@remixicon/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, boolean | null | undefined>>({});
  const [showDebug, setShowDebug] = useState(false);
  const [isTestLoginLoading, setIsTestLoginLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const { signIn, authState } = useAuth();
  
  // Check if environment variables are properly set
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    setDebugInfo({
      supabaseUrlDefined: !!supabaseUrl,
      supabaseKeyDefined: !!supabaseKey,
      authStateLoading: authState.isLoading,
      authStateAuthenticated: authState.isAuthenticated,
      userDefined: !!authState.user
    });
    
    // Log the environment check
    logger.debug('Login page environment check', {
      supabaseUrlDefined: !!supabaseUrl,
      supabaseKeyDefined: !!supabaseKey,
      authLoading: authState.isLoading,
      component: 'LoginPage'
    });
  }, [authState.isLoading, authState.isAuthenticated, authState.user]);
  
  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      setRedirecting(true);
      logger.info('User already authenticated, redirecting to dashboard', { 
        userId: authState.user.id,
        component: 'LoginPage'
      });
      
      // Use window.location for a full redirect which is more forceful than router.push
      window.location.href = '/dashboard';
    }
  }, [authState.isAuthenticated, authState.user]);
  
  // If still loading, return loading state
  if (authState.isLoading) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2.5"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2.5"></div>
          <div className="h-12 bg-gray-200 rounded w-full mb-6"></div>
        </div>
        <p className="text-gray-500 mt-4">Checking authentication status...</p>
      </div>
    );
  }
  
  // If redirecting, show a loading state
  if (redirecting) {
    // simple progressive loader
    if (progress < 100) {
      setTimeout(() => setProgress((p) => Math.min(100, p + 12)), 120);
    }
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="mb-4 text-center text-gray-700">Weiterleiten …</div>
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-[#CEFF65] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }
  
  // If already authenticated, don't render anything (will redirect in effect)
  if (authState.isAuthenticated) {
    return null;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      logger.info('Attempting login', { email, component: 'LoginPage' });
      await signIn(email, password);
      logger.info('Login successful', { email, component: 'LoginPage' });
      
      setRedirecting(true);
      
      // Use both methods for redirection to ensure it works
      router.push('/dashboard');
      
      // Add a small timeout and then use a more forceful redirect if router.push doesn't work
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (err) {
      logger.error('Login failed', { email, component: 'LoginPage' });
      logger.logError(err, 'Login error details');
      
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      }
    } finally {
      // Only set loading to false if we're not redirecting
      if (!redirecting) {
        setLoading(false);
      }
    }
  };
  
  // Handle test login mode
  const handleTestLogin = async () => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    
    try {
      setIsTestLoginLoading(true);
      logger.info('Attempting test login', { component: 'LoginPage', testMode: true });
      
      // Use a known test email/password that will trigger test mode
      await signIn('test@example.com', 'password123');
      
      setRedirecting(true);
      
      // Use both redirection methods for redundancy
      router.push('/dashboard');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error) {
      logger.logError(error, 'Test login failed', { component: 'LoginPage' });
      setError('Test login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      if (!redirecting) {
        setIsTestLoginLoading(false);
      }
    }
  };
  
  // Hardcoded demo user credentials for test environments
  const fillDemoCredentials = () => {
    setEmail('test@example.com');
    setPassword('password123');
  };
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4 text-gray-900">Login</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p className="font-bold">Login fehlgeschlagen</p>
          <p>{error}</p>
          
          {isDevelopment && error.includes('Supabase') && (
            <div className="mt-3">
              <p className="text-sm font-medium">Having trouble with real login?</p>
              <button
                onClick={handleTestLogin}
                className="text-sm text-red-800 underline mt-1"
              >
                Try Development Test Mode instead
              </button>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full px-4 h-11 text-base border border-gray-300 rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Passwort
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full pr-10 px-4 h-11 text-base border border-gray-300 rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              className="absolute inset-y-0 right-2 inline-flex items-center text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
            >
              {showPassword ? <RiEyeOffLine className="h-5 w-5" /> : <RiEyeLine className="h-5 w-5" />}
            </button>
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full h-11 flex justify-center items-center rounded-md shadow-xs text-sm font-medium bg-[#CEFF65] text-[#02403D] hover:bg-[#C2F95A] border border-[#CEFF65] ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </div>
      </form>
      
      {isDevelopment && (
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h2 className="text-gray-700 font-medium mb-2">Development Options</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-800 font-medium mb-2">Development Test Mode</h3>
            <p className="text-sm text-blue-700 mb-3">
              Use test mode to bypass Supabase authentication (only available in development)
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleTestLogin}
                disabled={isTestLoginLoading}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 ${
                  isTestLoginLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isTestLoginLoading ? 'Loading...' : 'Use Test Mode'}
              </button>
              <button
                onClick={fillDemoCredentials}
                className="flex-1 py-2 px-3 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                Fill Test Credentials
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <button 
              onClick={() => setShowDebug(!showDebug)} 
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
            
            {showDebug && (
              <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
                <h3 className="font-bold mb-2">Debug Information:</h3>
                <pre className="overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-4 text-center text-sm text-gray-600">Noch kein Konto? Bitte kontaktieren Sie den Administrator.</div>
    </div>
  );
} 