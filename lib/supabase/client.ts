import { createBrowserClient } from '@supabase/ssr';

// Create a single supabase client for browser-side interactivity
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in client');
    console.log('URL defined:', !!supabaseUrl);
    console.log('Key defined:', !!supabaseAnonKey);
  }
  
  // Create the client with error handling
  try {
    // Use setTimeout to handle requests that take too long
    const client = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '', {
      auth: {
        persistSession: true,
        autoRefreshToken: true, 
        detectSessionInUrl: true,
        // Add more generous timeouts to prevent resource errors
        flowType: 'pkce'
      },
      global: {
        // Add global fetch options to improve stability
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            // Add timeout signal to prevent hanging requests
            signal: AbortSignal.timeout(15000) // 15 second timeout
          });
        }
      }
    });

    return client;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    // Return a minimal client that won't throw errors but won't work either
    // This prevents the app from crashing during SSR/hydration
    return createBrowserClient('https://placeholder-url.supabase.co', 'placeholder-key');
  }
};

// Export the client
export const supabase = getSupabaseClient();

// We're always using real data
export const isDemoMode = false; 