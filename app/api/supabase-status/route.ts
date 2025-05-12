import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    // Get project reference from URL or from env vars
    const projectRef = url.searchParams.get('ref') || 
                       (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
                         .replace('https://', '')
                         .replace('.supabase.co', '');
    
    if (!projectRef) {
      return NextResponse.json({
        success: false,
        message: 'No project reference provided',
        details: 'Provide a project reference as ?ref=YOUR_PROJECT_REF or set NEXT_PUBLIC_SUPABASE_URL'
      }, { status: 400 });
    }
    
    console.log(`Checking Supabase project status for: ${projectRef}`);
    
    // Call Supabase status API directly
    const statusUrl = `https://status.supabase.com/api/v2/status.json`;
    
    try {
      const response = await fetch(statusUrl, { cache: 'no-store' });
      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        projectRef,
        supabaseStatus: data.status,
        message: `Supabase service status: ${data.status.description}`,
        details: data
      });
    } catch (error) {
      console.error('Error fetching Supabase status:', error);
      return NextResponse.json({
        success: false,
        message: 'Error fetching Supabase status',
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 