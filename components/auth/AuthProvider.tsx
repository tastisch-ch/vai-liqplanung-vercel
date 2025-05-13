'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { authClient } from '@/lib/auth/client-auth';
import logger from '@/lib/logger';

type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  isAdmin?: boolean;
  isReadOnly?: boolean;
};

interface UserProfile {
  role?: 'admin' | 'readonly' | 'user';
  [key: string]: any; // For other profile properties
}

type AuthContextType = {
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: UserProfile) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
  isAdmin: false,
  isReadOnly: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  
  // Function to refresh authentication status and ensure cookies are set
  const refreshAuth = async () => {
    try {
      logger.debug('Refreshing auth session', { component: 'AuthProvider' });
      
      // First check if user is already authenticated
      const user = await authClient.getCurrentUser();
      
      if (user) {
        // Force session refresh to ensure cookies are set
        await authClient.refreshSession();
        
        const updatedUser = await authClient.getCurrentUser();
        
        if (updatedUser) {
          logger.info('Auth session refreshed', { 
            userId: updatedUser.id,
            component: 'AuthProvider'
          });
          
          // Get user profile
          let isAdmin = false;
          let isReadOnly = false;
          
          try {
            const profile = await authClient.getProfile(updatedUser.id);
            const profileData = profile as UserProfile;
            isAdmin = profileData?.role === 'admin';
            isReadOnly = profileData?.role === 'readonly';
          } catch (error) {
            logger.warn('Error fetching profile during refresh', {
              userId: updatedUser.id,
              component: 'AuthProvider'
            });
          }
          
          setAuthState({
            isAuthenticated: true,
            user: updatedUser,
            isLoading: false,
            isAdmin,
            isReadOnly,
          });
          
          return;
        }
      }
      
      // If no user after refresh, clear auth state
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isAdmin: false,
        isReadOnly: false,
      });
      
    } catch (error) {
      logger.logError(error, 'Error refreshing auth session', {
        component: 'AuthProvider'
      });
    }
  };
  
  // Check for existing session when the component mounts
  useEffect(() => {
    const checkSession = async () => {
      try {
        logger.debug('Checking user session', { component: 'AuthProvider' });
        
        // First check if the Supabase URL and key are defined
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          logger.error('Missing Supabase environment variables', {
            component: 'AuthProvider',
            supabaseUrlDefined: !!supabaseUrl,
            supabaseKeyDefined: !!supabaseKey
          });
          
          setAuthState({
            ...initialState,
            isLoading: false
          });
          return;
        }
        
        const user = await authClient.getCurrentUser();
        
        if (user) {
          logger.info('Session found for user', { 
            userId: user.id,
            component: 'AuthProvider'
          });
          
          // Force session refresh to ensure cookies are set properly
          await authClient.refreshSession();
        } else {
          logger.info('No active session found', { component: 'AuthProvider' });
        }
        
        let isAdmin = false;
        let isReadOnly = false;
        
        if (user) {
          // Get user profile for additional info
          try {
            const profile = await authClient.getProfile(user.id);
            const profileData = profile as UserProfile;
            isAdmin = profileData?.role === 'admin';
            isReadOnly = profileData?.role === 'readonly';
            
            logger.debug('User profile loaded', {
              userId: user.id,
              role: profileData?.role,
              component: 'AuthProvider'
            });
          } catch (error) {
            logger.logError(error, 'Error fetching user profile', {
              userId: user.id,
              component: 'AuthProvider'
            });
            // Continue with authentication even if profile loading fails
            // Default to standard user permissions
            isAdmin = false;
            isReadOnly = false;
          }
        }
        
        setAuthState({
          isAuthenticated: !!user,
          user,
          isLoading: false,
          isAdmin,
          isReadOnly,
        });
      } catch (error) {
        logger.logError(error, 'Error checking session in AuthProvider', {
          component: 'AuthProvider'
        });
        
        setAuthState({
          ...initialState,
          isLoading: false,
        });
      }
    };
    
    checkSession();
  }, []);
  
  // Auth methods
  const signIn = async (email: string, password: string) => {
    try {
      logger.debug('Signing in user', { email, component: 'AuthProvider' });
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        const error = new Error('Missing Supabase environment variables');
        logger.error('Sign in failed - missing env vars', {
          component: 'AuthProvider',
          supabaseUrlDefined: !!supabaseUrl,
          supabaseKeyDefined: !!supabaseKey
        });
        throw error;
      }
      
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { user } = await authClient.signIn(email, password);
      
      if (!user) {
        throw new Error('Authentication failed - no user returned');
      }
      
      logger.info('User signed in successfully', {
        userId: user.id,
        email: user.email,
        component: 'AuthProvider'
      });
      
      let isAdmin = false;
      let isReadOnly = false;
      
      if (user) {
        try {
          const profile = await authClient.getProfile(user.id);
          const profileData = profile as UserProfile;
          isAdmin = profileData?.role === 'admin';
          isReadOnly = profileData?.role === 'readonly';
          
          logger.debug('User profile loaded after sign in', {
            userId: user.id,
            role: profileData?.role,
            component: 'AuthProvider'
          });
        } catch (profileError) {
          logger.logError(profileError, 'Error fetching profile after sign in', {
            userId: user.id,
            component: 'AuthProvider'
          });
          // Continue with authentication even if profile loading fails
          isAdmin = false;
          isReadOnly = false;
        }
      }
      
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        isAdmin,
        isReadOnly,
      });
    } catch (error) {
      logger.logError(error, 'Error signing in', {
        email,
        component: 'AuthProvider'
      });
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };
  
  const signUp = async (email: string, password: string, userData?: UserProfile) => {
    try {
      logger.debug('Signing up new user', { email, component: 'AuthProvider' });
      
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { user } = await authClient.signUp(email, password, userData);
      
      logger.info('User signed up successfully', {
        userId: user?.id,
        email,
        component: 'AuthProvider'
      });
      
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        isAdmin: userData?.role === 'admin',
        isReadOnly: userData?.role === 'readonly',
      });
    } catch (error) {
      logger.logError(error, 'Error signing up', {
        email,
        component: 'AuthProvider'
      });
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };
  
  const signOut = async () => {
    try {
      logger.debug('Signing out user', { 
        userId: authState.user?.id,
        component: 'AuthProvider'
      });
      
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Call the auth client's signOut method
      await authClient.signOut();
      
      logger.info('User signed out successfully', {
        userId: authState.user?.id,
        component: 'AuthProvider'
      });
      
      // Clear auth state completely
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isAdmin: false,
        isReadOnly: false,
      });
      
      // Clear any auth-related items from localStorage as an extra precaution
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-auth-token');
      } catch (storageError) {
        // Ignore storage errors
        logger.debug('Error clearing local storage during logout', { 
          component: 'AuthProvider',
          error: storageError instanceof Error ? storageError.message : 'Unknown error'
        });
      }
    } catch (error) {
      logger.logError(error, 'Error signing out', {
        userId: authState.user?.id,
        component: 'AuthProvider'
      });
      
      // Still clear auth state even if there's an error with the signOut API call
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isAdmin: false,
        isReadOnly: false,
      });
      
      // Re-throw the error to be handled by the component
      throw error;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        authState,
        signIn,
        signUp,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 