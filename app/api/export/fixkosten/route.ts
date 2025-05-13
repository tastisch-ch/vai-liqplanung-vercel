import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { fixkostenToCsv } from '@/lib/export/csv';
import { getMimeType } from '@/lib/export/utils';
import { Fixkosten } from '@/models/types';
import { createClient } from '@supabase/supabase-js';

/**
 * Export fixed costs to CSV
 * @route GET /api/export/fixkosten
 * @query format - Export format (csv, excel - default: csv)
 * @query active - Filter for active/inactive fixed costs (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Log all headers for debugging
    const headers = Object.fromEntries(request.headers);
    console.log('Request headers:', Object.keys(headers).join(', '));
    
    // Get all cookies for debugging
    const allCookies = request.cookies.getAll();
    console.log('All request cookies:', allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const activeFilter = searchParams.get('active');

    // For now, only support CSV (will add Excel later)
    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Unsupported format', details: 'Only CSV format is currently supported' },
        { status: 400 }
      );
    }
    
    // Get the authentication tokens from different sources
    const authCookieName = `sb-${supabaseUrl.match(/(?:\/\/|^)([\w-]+)\.supabase/)?.[1]}-auth-token`;
    const authCookie = request.cookies.get(authCookieName)?.value;
    const directAccessToken = request.cookies.get('sb-access-token')?.value || searchParams.get('access_token');
    const directRefreshToken = request.cookies.get('sb-refresh-token')?.value || searchParams.get('refresh_token');
    
    console.log('Auth cookie exists:', !!authCookie);
    console.log('Direct access token exists:', !!directAccessToken);
    
    // Create direct Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    // Try to extract user ID directly from JWT token
    let userId: string | null = null;
    
    if (directAccessToken) {
      try {
        // Manually parse the JWT token to extract user ID
        // JWT format: header.payload.signature
        const parts = directAccessToken.split('.');
        if (parts.length === 3) {
          // Decode the payload (middle part)
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          
          // The subject claim (sub) contains the user ID
          if (payload.sub) {
            userId = payload.sub;
            console.log('Successfully extracted user ID from JWT:', userId);
          }
        }
      } catch (e) {
        console.error('Error parsing JWT token:', e);
      }
    }
    
    // If we couldn't extract from JWT, try other methods
    if (!userId) {
      // Try with Supabase auth methods as backup
      try {
        if (directAccessToken && directRefreshToken) {
          console.log('Trying authentication with direct tokens');
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: directAccessToken,
              refresh_token: directRefreshToken
            });
            
            if (!sessionError && sessionData.user) {
              userId = sessionData.user.id;
              console.log('Authenticated with direct tokens, user:', userId);
            } else {
              console.error('Direct token session error:', sessionError);
            }
          } catch (e) {
            console.error('Error setting session with direct tokens:', e);
          }
        }
        
        // Final attempt with getUser
        if (!userId) {
          console.log('Trying to get user from current session');
          const { data, error } = await supabase.auth.getUser();
          
          if (!error && data.user) {
            userId = data.user.id;
            console.log('Got user from current session:', userId);
          } else {
            console.error('Get user error:', error);
          }
        }
      } catch (e) {
        console.error('Error in authentication backup methods:', e);
      }
    }
    
    // If all authentication methods failed and in development mode, use a test user ID
    if (!userId && process.env.NODE_ENV === 'development') {
      // This is a fallback for development only - NEVER use in production
      const testParam = searchParams.get('test_user_id');
      if (testParam) {
        userId = testParam;
        console.log('DEVELOPMENT MODE: Using test user ID from URL parameter:', userId);
      }
      
      // Hardcoded user ID as an absolute last resort for dev testing
      if (!userId && directAccessToken) {
        // Extract a user ID hint from the token if possible
        try {
          const parts = directAccessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log('Token payload info:', { iss: payload.iss, aud: payload.aud, email: payload.email });
            
            // If the token has a user email that matches, use a known ID
            if (payload.email === 'christoph@vaios.ch') {
              userId = '25fabd31-7992-42f2-b64a-32f5993c0456'; // Replace with actual ID if known
              console.log('DEV MODE: Using hardcoded ID for', payload.email);
            }
          }
        } catch (e) {
          console.error('Error extracting email from token in dev mode:', e);
        }
      }
    }
    
    // If all authentication methods failed
    if (!userId) {
      console.log('All authentication methods failed');
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User must be logged in to export data' },
        { status: 401 }
      );
    }
    
    // Build query
    let query = supabase
      .from('fixkosten')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    
    // Apply active filter if provided
    if (activeFilter === 'true') {
      const today = new Date().toISOString();
      query = query
        .or(`enddatum.gt.${today},enddatum.is.null`)
        .lt('start', today);
    } else if (activeFilter === 'false') {
      const today = new Date().toISOString();
      query = query.lt('enddatum', today);
    }
    
    // Execute query
    const { data: fixkosten, error } = await query;
    
    if (error) {
      console.error('Error fetching fixed costs for export:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`Fetched ${fixkosten.length} fixed costs for export`);
    
    // Parse dates in fixkosten
    const parsedFixkosten = fixkosten.map(f => ({
      ...f,
      start: new Date(f.start),
      enddatum: f.enddatum ? new Date(f.enddatum) : null
    })) as Fixkosten[];
    
    // Generate CSV data
    const { content, filename } = fixkostenToCsv(parsedFixkosten);
    
    // Set headers for file download
    const headers2 = new Headers();
    headers2.set('Content-Type', getMimeType('csv'));
    headers2.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Return the CSV content
    return new NextResponse(content, {
      status: 200,
      headers: headers2
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 