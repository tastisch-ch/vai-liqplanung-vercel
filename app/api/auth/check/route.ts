import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Debug auth cookies
    const cookieNames = Array.from(request.cookies.getAll()).map(c => c.name);
    const allCookies = request.cookies.getAll();
    console.log('All request cookies:', allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));
    
    const authCookies = cookieNames.filter(name => 
      name.includes('sb-') || 
      name.includes('supabase') || 
      name.includes('auth')
    );
    
    // Use the route handler specific client that can access cookies
    const supabase = createRouteHandlerSupabaseClient(request);
    
    // If we have manual access token cookies but no session, try to manually create a session
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (accessToken && refreshToken) {
      console.log('Detected manual auth tokens, setting session');
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          console.error('Error setting manual session:', error);
        } else if (data.session) {
          console.log('Successfully set manual session');
        }
      } catch (error) {
        console.error('Exception setting manual session:', error);
      }
    }
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error in auth check:', sessionError);
      return NextResponse.json(
        { 
          authenticated: false, 
          error: sessionError.message, 
          cookies: { cookieNames, authCookies },
          headersPresent: Object.keys(Object.fromEntries(request.headers)).length > 0
        },
        { status: 401 }
      );
    }
    
    if (!session || !session.user) {
      console.log('No session found in auth check');
      return NextResponse.json(
        { 
          authenticated: false, 
          message: 'No valid session found',
          cookies: { cookieNames, authCookies },
          headersPresent: Object.keys(Object.fromEntries(request.headers)).length > 0 
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        authenticated: true,
        userId: session.user.id,
        email: session.user.email,
        cookies: { cookieNames, authCookies },
        headersPresent: Object.keys(Object.fromEntries(request.headers)).length > 0
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { 
        authenticated: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        cookies: { cookieNames: Array.from(request.cookies.getAll()).map(c => c.name) },
        headersPresent: Object.keys(Object.fromEntries(request.headers)).length > 0
      },
      { status: 500 }
    );
  }
} 