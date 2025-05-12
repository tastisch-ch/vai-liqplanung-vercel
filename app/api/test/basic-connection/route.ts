import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('Basic connection test called');
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase environment variables',
        environmentStatus: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 });
    }
    
    console.log(`URL: ${supabaseUrl.substring(0, 20)}...`);
    console.log(`Key starts with: ${supabaseKey.substring(0, 10)}...`);
    
    try {
      // Create a basic Supabase client
      console.log('Creating basic Supabase client...');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try a basic health check
      console.log('Testing health...');
      
      // Simply testing if the client can make a request
      const { error } = await supabase.from('_health').select('*').limit(1).single();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "Results contain 0 rows" which is fine for our test
        console.error('Health check error:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to connect to Supabase',
          error: error.message,
          code: error.code,
          details: error.details
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Supabase'
      });
    } catch (connectionError) {
      console.error('Connection error:', connectionError);
      return NextResponse.json({
        success: false,
        message: 'Error creating Supabase client',
        error: connectionError instanceof Error ? connectionError.message : String(connectionError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 