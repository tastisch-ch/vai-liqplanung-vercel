import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Extract all cookies
    const allCookies = request.cookies.getAll();
    const cookieNames = allCookies.map(c => c.name);
    const cookieValues = Object.fromEntries(
      allCookies.map(c => [c.name, c.value.substring(0, 20) + '...'])
    );
    
    const authCookies = cookieNames.filter(name => 
      name.includes('sb-') || 
      name.includes('supabase') || 
      name.includes('auth')
    );

    // Check for manual auth tokens
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;
    
    // Use Supabase client to check auth
    const supabase = createRouteHandlerSupabaseClient(request);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Prepare HTML response with cookie and auth info
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Auth Test Connection</title>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto; }
            .success { color: green; }
            .error { color: red; }
            .section { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Authentication Test</h1>
          
          <div class="section">
            <h2>Cookie Information</h2>
            <p>Total cookies: ${allCookies.length}</p>
            <p>Auth-related cookies: ${authCookies.length}</p>
            
            <h3>All Cookies</h3>
            <pre>${JSON.stringify(cookieValues, null, 2)}</pre>
            
            <h3>Auth Cookies</h3>
            <pre>${JSON.stringify(authCookies, null, 2)}</pre>
          </div>
          
          <div class="section">
            <h2>Manual Auth Tokens</h2>
            <p>Access Token: ${accessToken ? '<span class="success">Present</span>' : '<span class="error">Missing</span>'}</p>
            <p>Refresh Token: ${refreshToken ? '<span class="success">Present</span>' : '<span class="error">Missing</span>'}</p>
          </div>
          
          <div class="section">
            <h2>Supabase Session</h2>
            ${sessionError 
              ? `<p class="error">Session Error: ${sessionError.message}</p>` 
              : session 
                ? `<p class="success">Valid session found!</p>
                   <p>User ID: ${session.user.id}</p>
                   <p>Email: ${session.user.email}</p>
                   <pre>${JSON.stringify({
                     user_id: session.user.id,
                     email: session.user.email,
                     expires_at: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'unknown',
                   }, null, 2)}</pre>`
                : `<p class="error">No valid session found</p>`
            }
          </div>
          
          <div class="section">
            <h2>Test Actions</h2>
            <button onclick="refreshPage()">Refresh Page</button>
            <button onclick="clearCookies()">Clear Cookies</button>
            <button onclick="goToDashboard()">Go to Dashboard</button>
            <button onclick="goToImport()">Go to Data Import</button>
            
            <script>
              function refreshPage() {
                window.location.reload();
              }
              
              function clearCookies() {
                document.cookie.split(';').forEach(function(c) {
                  document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
                alert('Cookies cleared. Refreshing page...');
                window.location.reload();
              }
              
              function goToDashboard() {
                window.location.href = '/dashboard';
              }
              
              function goToImport() {
                window.location.href = '/datenimport';
              }
            </script>
          </div>
        </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
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