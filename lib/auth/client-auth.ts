import { createClient, Session, User, PostgrestResponse } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// Mock test user for development mode when Supabase is unavailable
const TEST_USER: User = {
  id: 'test-user-id',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

// Test profile for mock user
const TEST_PROFILE = {
  id: TEST_USER.id,
  name: 'Test User',
  role: 'admin',
  created_at: TEST_USER.created_at,
};

// Flag to enable test mode
const ENABLE_TEST_MODE = process.env.NODE_ENV === 'development';

// Force test mode even when Supabase is available in development
// Set this to true to always use test mode in development
const FORCE_TEST_MODE = false;

// Client-side only authentication module
const createAuthClient = () => {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase environment variables for auth client', {
      supabaseUrlDefined: !!supabaseUrl,
      supabaseKeyDefined: !!supabaseKey,
      component: 'client-auth'
    });
  }
  
  // Create the client
  let supabase: ReturnType<typeof createClient> | null = null;
  
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('Supabase client initialized', { component: 'client-auth' });
  } catch (error) {
    logger.logError(error, 'Failed to initialize Supabase client', { component: 'client-auth' });
  }
  
  // Track test mode user state
  let testModeActive = false;
  let testUser: User | null = null;
  
  // Helper to check if we should use test mode
  const shouldUseTestMode = (testEmail?: string) => {
    // Always use test mode when forced in development
    if (ENABLE_TEST_MODE && FORCE_TEST_MODE) {
      return true;
    }
    
    // Use test mode when Supabase is unavailable
    if (ENABLE_TEST_MODE && (!supabase || !supabaseUrl || !supabaseKey)) {
      return true;
    }
    
    // Use test mode for specific test emails
    if (ENABLE_TEST_MODE && testEmail && 
        (testEmail === 'test@example.com' || testEmail.includes('test'))) {
      return true;
    }
    
    return false;
  };
  
  // Auth methods
  const signIn = async (email: string, password: string) => {
    // Development test mode
    if (shouldUseTestMode(email)) {
      logger.warn('Using TEST MODE login', {
        email,
        testMode: true,
        component: 'client-auth'
      });
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      testModeActive = true;
      testUser = { ...TEST_USER, email };
      
      return { user: testUser, session: null };
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      logger.info('User signed in successfully', { email, component: 'client-auth' });
      return { user: data.user, session: data.session };
    } catch (error) {
      logger.logError(error, 'Login error in client-auth', { email, component: 'client-auth' });
      throw error;
    }
  };
  
  // Force real Supabase authentication, bypassing test mode
  // Useful for testing real credentials in development
  const forceRealSignIn = async (email: string, password: string) => {
    try {
      logger.info('Forcing real Supabase authentication', { 
        email, 
        component: 'client-auth',
        bypassTestMode: true
      });
      
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      logger.info('Real user signed in successfully', { email, component: 'client-auth' });
      
      // Disable test mode
      testModeActive = false;
      testUser = null;
      
      return { user: data.user, session: data.session };
    } catch (error) {
      logger.logError(error, 'Real login error in client-auth', { email, component: 'client-auth' });
      throw error;
    }
  };
  
  const signUp = async (email: string, password: string, userData: any = {}) => {
    // Test mode signup
    if (shouldUseTestMode(email)) {
      logger.warn('Using TEST MODE signup', {
        email,
        testMode: true,
        component: 'client-auth'
      });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      testModeActive = true;
      testUser = { ...TEST_USER, email };
      
      return { user: testUser, session: null };
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // First create the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      
      // If user is created, create a profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: userData.name || email.split('@')[0],
            role: userData.role || 'user',
            created_at: new Date().toISOString()
          });
        
        if (profileError) {
          logger.error('Error creating profile:', { error: profileError, component: 'client-auth' });
        }
      }
      
      logger.info('User signed up successfully', { email, component: 'client-auth' });
      return { user: data.user, session: data.session };
    } catch (error) {
      logger.logError(error, 'Sign up error in client-auth', { email, component: 'client-auth' });
      throw error;
    }
  };
  
  const signOut = async () => {
    // Test mode signout
    if (testModeActive) {
      logger.warn('TEST MODE sign out', { testMode: true, component: 'client-auth' });
      testModeActive = false;
      testUser = null;
      
      // Clear any test session data that might be in localStorage
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-auth-token');
      } catch (e) {
        // Ignore localStorage errors
      }
      
      return true;
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // Call Supabase signOut
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear cookies by expiring them (in case Supabase doesn't handle this fully)
      try {
        document.cookie = 'sb-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'supabase-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        // Clear local storage
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-auth-token');
      } catch (e) {
        // Ignore cookie/localStorage errors
        logger.debug('Error clearing cookies/storage, but continuing signout process', { 
          component: 'client-auth',
          error: e instanceof Error ? e.message : 'Unknown error'
        });
      }
      
      logger.info('User signed out successfully', { component: 'client-auth' });
      return true;
    } catch (error) {
      logger.logError(error, 'Sign out error in client-auth', { component: 'client-auth' });
      throw error;
    }
  };
  
  const getCurrentUser = async (): Promise<User | null> => {
    // Test mode get user
    if (testModeActive && testUser) {
      logger.debug('TEST MODE getCurrentUser', { testMode: true, component: 'client-auth' });
      return testUser;
    }
    
    // In development with forced test mode, create a test user if needed
    if (ENABLE_TEST_MODE && FORCE_TEST_MODE && !testModeActive) {
      logger.debug('TEST MODE: Auto-creating test user for getCurrentUser', { 
        testMode: true, 
        component: 'client-auth' 
      });
      testModeActive = true;
      testUser = { ...TEST_USER, email: 'auto@test.com' };
      return testUser;
    }
    
    try {
      if (!supabase) {
        logger.warn('Supabase client not initialized in getCurrentUser', { component: 'client-auth' });
        return null;
      }
      
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch (error) {
      logger.logError(error, 'Get user error in client-auth', { component: 'client-auth' });
      return null;
    }
  };
  
  const getCurrentSession = async (): Promise<Session | null> => {
    // Test mode get session (always returns null)
    if (testModeActive || (ENABLE_TEST_MODE && FORCE_TEST_MODE)) {
      logger.debug('TEST MODE getCurrentSession', { testMode: true, component: 'client-auth' });
      return null;
    }
    
    try {
      if (!supabase) {
        logger.warn('Supabase client not initialized in getCurrentSession', { component: 'client-auth' });
        return null;
      }
      
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch (error) {
      logger.logError(error, 'Get session error in client-auth', { component: 'client-auth' });
      return null;
    }
  };
  
  const getProfile = async (userId: string) => {
    // Test mode profile
    if (testModeActive && testUser && userId === testUser.id) {
      logger.debug('TEST MODE getProfile', { testMode: true, userId, component: 'client-auth' });
      return TEST_PROFILE;
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { data, error }: PostgrestResponse<any> = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // Check for recursion error and provide fallback profile
        if (error.code === '42P17' && error.message.includes('infinite recursion')) {
          logger.warn('Using fallback profile due to recursion error in RLS policy', { 
            userId, 
            component: 'client-auth' 
          });
          return {
            id: userId,
            name: 'User',
            role: 'user',
            created_at: new Date().toISOString()
          };
        }
        throw error;
      }
      
      logger.debug('Profile fetched successfully', { userId, component: 'client-auth' });
      return data;
    } catch (error) {
      logger.logError(error, 'Get profile error in client-auth', { userId, component: 'client-auth' });
      
      // Return a fallback profile instead of throwing
      return {
        id: userId,
        name: 'User',
        role: 'user',
        created_at: new Date().toISOString()
      };
    }
  };
  
  return {
    supabase,
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    getCurrentSession,
    getProfile,
    isTestModeActive: () => testModeActive,
    forceRealSignIn
  };
};

// Create singleton instance
export const authClient = createAuthClient();

// Helper to check if user is authenticated client-side
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await authClient.getCurrentSession();
  return !!session;
}; 