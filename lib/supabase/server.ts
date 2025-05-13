import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Create a client for server components
export function createServerSupabaseClient() {
  // Get environment variables with fallbacks
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
  }
  
  // Using the documented pattern for Next.js App Router
  // @ts-ignore - Next.js types are incorrect but this works
  const cookieStore = cookies();
  
  // Create a server client that can access cookies
  return createServerClient(
    supabaseUrl, 
    supabaseAnonKey,
    {
      cookies: {
        get: (name) => {
          // @ts-ignore - Next.js types are incorrect but this works
          return cookieStore.get(name)?.value;
        },
        set: (name, value, options) => {
          try {
            // @ts-ignore - Next.js types are incorrect but this works
            cookieStore.set({
              name,
              value,
              ...options
            });
          } catch (error) {
            console.error('Error setting cookie in read-only context:', error);
          }
        },
        remove: (name, options) => {
          try {
            // @ts-ignore - Next.js types are incorrect but this works
            cookieStore.delete(name);
          } catch (error) {
            console.error('Error removing cookie in read-only context:', error);
          }
        }
      }
    }
  );
}

// Special version for API routes where we have a request/response object
export function createRouteHandlerSupabaseClient(request: NextRequest) {
  // Get environment variables with fallbacks
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
  }
  
  // Get all cookies for debugging
  const allCookies = request.cookies.getAll();
  console.log('All request cookies:', allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));
  
  // Extract project reference from the URL
  const projectRef = supabaseUrl.match(/(?:\/\/|^)([\w-]+)\.supabase/)?.[1] || '';
  
  // Create a server client that can access cookies from the request
  return createServerClient(
    supabaseUrl, 
    supabaseAnonKey,
    {
      cookies: {
        get: (name) => {
          // First try exact name match
          const value = request.cookies.get(name)?.value;
          console.log(`Getting cookie: ${name} = ${value ? 'exists' : 'not found'}`);
          
          if (value) return value;
          
          // If not found and the cookie name looks like an auth token,
          // try our manually set cookies as fallbacks
          if (name.includes('auth-token')) {
            // Try the sb-access-token and sb-refresh-token cookies as fallbacks
            const accessToken = request.cookies.get('sb-access-token')?.value;
            const refreshToken = request.cookies.get('sb-refresh-token')?.value;
            
            if (accessToken && refreshToken) {
              // Construct and return a JSON object that mimics the structure supabase expects
              console.log('Using fallback auth tokens from manual cookies');
              return JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: Math.floor(Date.now() / 1000) + 3600
              });
            }
          }
          
          return null;
        },
        set: (name, value, options) => {
          // Cannot set cookies in route handlers easily
          // Just log that we tried
          console.log(`Would set cookie in route handler: ${name}=${value?.substring(0, 20)}...`);
        },
        remove: (name, options) => {
          // Cannot remove cookies in route handlers easily
          // Just log that we tried
          console.log(`Would remove cookie in route handler: ${name}`);
        }
      }
    }
  );
} 