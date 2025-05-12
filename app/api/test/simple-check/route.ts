import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const testUrl = url.searchParams.get('url');
    const testKey = url.searchParams.get('key');
    
    // Get our environment variables if no params were provided
    const envUrl = testUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = testKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Basic validation
    if (!envUrl || !envKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase credentials',
        details: {
          hasUrl: !!envUrl,
          hasKey: !!envKey
        }
      }, { status: 400 });
    }
    
    // Create a client
    console.log(`Testing with URL: ${envUrl.substring(0, 15)}...`);
    console.log(`Testing with key: ${envKey.substring(0, 10)}...`);
    
    const supabase = createClient(envUrl, envKey);
    
    // Test just by getting the service status instead of querying a table
    try {
      console.log('Getting service status...');
      
      // Try a simple auth check to verify auth is working
      const { data, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        return NextResponse.json({
          success: false,
          message: `Auth error: ${authError.message}`,
          error: authError,
          credentials: {
            url: envUrl.substring(0, 10) + '...',
            key: envKey.substring(0, 10) + '...'
          }
        }, { status: 500 });
      }
      
      // Success!
      return NextResponse.json({
        success: true,
        message: 'Supabase connection successful!',
        details: {
          url: envUrl.substring(0, 10) + '...',
          hasSession: !!data.session
        }
      });
    } catch (error) {
      console.error('Request error:', error);
      return NextResponse.json({
        success: false,
        message: 'Error making request to Supabase',
        error: error instanceof Error ? error.message : String(error),
        credentials: {
          url: envUrl.substring(0, 10) + '...',
          key: envKey.substring(0, 10) + '...'
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error in test endpoint',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 