import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('Test connection API called');
    
    // Test if environment variables are set correctly
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({
        success: false,
        message: 'Supabase environment variables are missing',
        environment: {
          url: !!url,
          key: !!key
        }
      }, { status: 500 });
    }
    
    // Print but truncate for security
    console.log(`Supabase URL: ${url.substring(0, 15)}...`);
    console.log(`API Key starts with: ${key.substring(0, 10)}...`);
    
    // Create Supabase client directly with environment variables
    console.log('Creating Supabase client...');
    const supabase = createClient(url, key);
    console.log('Supabase client created successfully');
    
    // Try a simple query
    try {
      console.log('Testing connection with a simple query...');
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Database query error:', error);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to query database', 
          error: error.message,
          hint: error.hint || 'No hint provided',
          details: error.details || 'No details provided',
          code: error.code || 'No code provided',
          credentials: {
            url_prefix: url.substring(0, 10) + '...',
            key_prefix: key.substring(0, 10) + '...',
            key_length: key.length
          }
        }, { status: 500 });
      }
      
      console.log('Query successful');
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully connected to Supabase!',
        data
      });
    } catch (queryError) {
      console.error('Error executing query:', queryError);
      return NextResponse.json({ 
        success: false, 
        message: 'Error executing database query',
        error: queryError instanceof Error ? queryError.message : String(queryError),
        credentials: {
          url_prefix: url.substring(0, 10) + '...',
          key_prefix: key.substring(0, 10) + '...',
          key_length: key.length
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in test-connection API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('Create test user API called');
    
    // Test environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({
        success: false,
        message: 'Supabase environment variables are missing'
      }, { status: 500 });
    }
    
    // Get request body
    let body;
    try {
      body = await request.json();
      console.log('Request body received:', body);
    } catch (e) {
      console.error('Error parsing request body:', e);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid request body'
      }, { status: 400 });
    }
    
    const { email, password, name } = body;
    
    if (!email || !password) {
      console.error('Missing required fields: email or password');
      return NextResponse.json({ 
        success: false, 
        message: 'Email and password are required' 
      }, { status: 400 });
    }
    
    // Create Supabase client directly
    console.log('Creating Supabase client...');
    const supabase = createClient(url, key);
    console.log('Supabase client created successfully');
    
    // Create user
    console.log('Creating user with email:', email);
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create user', 
        error: userError.message 
      }, { status: 500 });
    }
    
    if (!userData.user) {
      console.error('No user data returned from signUp');
      return NextResponse.json({ 
        success: false, 
        message: 'User creation returned no user data' 
      }, { status: 500 });
    }
    
    console.log('User created successfully:', userData.user.id);
    
    // Create profile for the user
    console.log('Creating profile for user...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userData.user.id,
        name: name || email.split('@')[0],
        role: 'admin',  // For testing, create an admin user
        created_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      return NextResponse.json({ 
        success: false, 
        message: 'User created but failed to create profile', 
        error: profileError.message,
        userId: userData.user.id
      }, { status: 500 });
    }
    
    console.log('Profile created successfully for user:', userData.user.id);
    return NextResponse.json({ 
      success: true, 
      message: 'Test user created successfully!',
      user: {
        id: userData.user.id,
        email: userData.user.email
      }
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred while creating the test user',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 