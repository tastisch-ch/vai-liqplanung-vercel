'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client-auth';
import logger from '@/lib/logger';
import { supabase } from '@/lib/supabase/client';

export default function EnvCheckPage() {
  const [envVars] = useState({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Defined' : 'Not defined',
    nodeEnv: process.env.NODE_ENV || 'unknown',
  });
  
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestLoginLoading, setIsTestLoginLoading] = useState(false);
  const [testCredentials, setTestCredentials] = useState({ email: '', password: '' });
  const [testLoginResult, setTestLoginResult] = useState<{success: boolean, message: string} | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string>('');
  const router = useRouter();
  
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        // Log this check
        logger.debug('Checking Supabase connection in env-check page', {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          component: 'EnvCheckPage'
        });
        
        // Add detailed connection info
        setConnectionDetails('Attempting to connect to Supabase...');
        
        // Test the connection by trying to fetch health status
        // This is simpler than getting the session
        const healthCheck = await supabase.from('_health').select('*').limit(1);
        
        // Log the health check attempt
        setConnectionDetails(prev => prev + `\nHealth check attempt: ${healthCheck.error ? 'Failed' : 'Success'}`);
        
        if (healthCheck.error) {
          throw healthCheck.error;
        }
        
        // If we get here, connection is ok
        setSupabaseStatus('connected');
        setConnectionDetails(prev => prev + '\nConnection successful!');
        logger.info('Successfully connected to Supabase', { component: 'EnvCheckPage' });
      } catch (error) {
        // Log detailed error information 
        setConnectionDetails(prev => prev + `\nConnection failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        logger.logError(error, 'Supabase connection error in env-check page', { component: 'EnvCheckPage' });
        setSupabaseStatus('error');
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Unknown error connecting to Supabase');
        }
      }
    };
    
    checkSupabase();
  }, []);
  
  // Handle test connection with real credentials
  const handleRealCredentialsTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testCredentials.email || !testCredentials.password) {
      setTestLoginResult({
        success: false,
        message: 'Please enter both email and password'
      });
      return;
    }
    
    if (supabaseStatus !== 'connected') {
      setTestLoginResult({
        success: false,
        message: 'Cannot test real credentials - Supabase connection not established'
      });
      return;
    }
    
    try {
      setIsTestLoginLoading(true);
      logger.info('Testing real Supabase login', { 
        email: testCredentials.email,
        component: 'EnvCheckPage' 
      });
      
      // Attempt to sign in with provided credentials
      // We're disabling test mode here by directly using forceRealSignIn
      const { user } = await authClient.forceRealSignIn(
        testCredentials.email,
        testCredentials.password
      );
      
      setTestLoginResult({
        success: true,
        message: `Successfully authenticated as ${user?.email || 'user'}`
      });
      
      // Wait a moment to show success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      logger.logError(error, 'Real credentials test failed', { component: 'EnvCheckPage' });
      setTestLoginResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown authentication error'
      });
    } finally {
      setIsTestLoginLoading(false);
    }
  };
  
  // Handle development test login
  const handleTestLogin = async () => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    
    try {
      setIsTestLoginLoading(true);
      logger.info('Attempting test login', { component: 'EnvCheckPage', testMode: true });
      
      // Use a test email/password
      await authClient.signIn('test@example.com', 'password123');
      
      // Delay a bit to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      logger.logError(error, 'Test login failed', { component: 'EnvCheckPage' });
      alert('Test login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsTestLoginLoading(false);
    }
  };
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Environment Check</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
        
        <table className="w-full mb-4">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Variable</th>
              <th className="text-left py-2">Value</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">NODE_ENV</td>
              <td className="py-2 font-mono text-sm">{envVars.nodeEnv}</td>
              <td className="py-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  envVars.nodeEnv === 'development' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {envVars.nodeEnv === 'development' ? 'Development' : 'Production'}
                </span>
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2">NEXT_PUBLIC_SUPABASE_URL</td>
              <td className="py-2 font-mono text-sm break-all">{envVars.supabaseUrl || 'Not defined'}</td>
              <td className="py-2">
                {envVars.supabaseUrl ? (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    Defined
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                    Missing
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2">NEXT_PUBLIC_SUPABASE_ANON_KEY</td>
              <td className="py-2 font-mono text-sm">
                {envVars.supabaseKey === 'Defined' ? '[REDACTED]' : 'Not defined'}
              </td>
              <td className="py-2">
                {envVars.supabaseKey === 'Defined' ? (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    Defined
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                    Missing
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Supabase Connection</h2>
        
        <div className="mb-4">
          <p className="font-medium mb-2">Status:</p>
          {supabaseStatus === 'checking' && (
            <div>
              <p className="text-blue-600 mb-2">Checking connection...</p>
              <pre className="text-xs font-mono bg-gray-50 p-2 rounded border">
                {connectionDetails || 'Initializing...'}
              </pre>
            </div>
          )}
          {supabaseStatus === 'connected' && (
            <div>
              <p className="text-green-600 mb-2">Connected to Supabase ✓</p>
              <p className="text-sm text-gray-700">
                Connection URL: <span className="font-mono">{envVars.supabaseUrl}</span>
              </p>
              <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded">
                <p className="text-green-800 font-medium">Your Supabase connection is working properly</p>
                <p className="text-sm text-green-700 mt-1">You can use real Supabase authentication.</p>
                <Link 
                  href="/login" 
                  className="mt-2 inline-block bg-green-600 text-white px-4 py-2 text-sm rounded-md hover:bg-green-700"
                >
                  Go to Login Page
                </Link>
              </div>
              
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-800 mb-2">Test Real Supabase Credentials</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Test if existing user credentials work with this Supabase instance
                </p>
                
                <form onSubmit={handleRealCredentialsTest} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={testCredentials.email}
                      onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter existing user email"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={testCredentials.password}
                      onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter existing user password"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isTestLoginLoading}
                    className={`w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 ${
                      isTestLoginLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isTestLoginLoading ? 'Testing...' : 'Test Credentials'}
                  </button>
                  
                  {testLoginResult && (
                    <div className={`mt-3 p-3 rounded-md text-sm ${
                      testLoginResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {testLoginResult.message}
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
          {supabaseStatus === 'error' && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
              <p className="font-bold">Connection Error</p>
              <p>{errorMessage}</p>
              
              <div className="mt-4 overflow-auto max-h-40">
                <pre className="text-xs font-mono bg-red-50 p-2 rounded border border-red-200 whitespace-pre-wrap">
                  {connectionDetails || 'No connection details available'}
                </pre>
              </div>
              
              {isDevelopment && (
                <div className="mt-4 p-4 bg-yellow-50 rounded">
                  <p className="font-bold text-yellow-800">Development Mode</p>
                  <p className="text-sm">
                    You can use test mode to proceed without a Supabase connection.
                    This will enable a mock authentication flow for development.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {isDevelopment && (
          <div className="mt-4 bg-blue-50 p-4 rounded border border-blue-200">
            <p className="font-bold text-blue-800">Development Test Mode Available</p>
            <p className="text-sm text-blue-700 mb-2">
              Development test mode is now enabled to allow you to use the application without a real Supabase connection.
              This creates a mock user with admin privileges for testing purposes.
            </p>
            <button
              onClick={handleTestLogin}
              disabled={isTestLoginLoading}
              className={`mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 ${
                isTestLoginLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isTestLoginLoading ? 'Loading...' : 'Enter Test Mode Now'}
            </button>
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        <Link 
          href="/login" 
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center"
        >
          Go to Login
        </Link>
        
        {isDevelopment && (
          <button
            onClick={handleTestLogin}
            disabled={isTestLoginLoading}
            className={`inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 ${
              isTestLoginLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isTestLoginLoading ? 'Loading...' : 'Use Development Test Mode'}
          </button>
        )}
        
        <Link 
          href="/" 
          className="inline-block bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-center"
        >
          Home
        </Link>
      </div>
    </div>
  );
} 