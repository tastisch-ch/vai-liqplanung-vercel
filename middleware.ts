import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    // Define public paths that don't require authentication
    const publicPaths = [
      '/login',
      '/api',
      '/favicon.ico',
      '/env-check',
      '/admin'
    ];
    
    const isPublicPath = publicPaths.some(path => 
      request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
    );
    
    // For the root path, check for existing session and redirect appropriately
    if (request.nextUrl.pathname === '/') {
      // Check if there's a session token in the cookies
      const hasSession = request.cookies.has('sb-auth-token') || 
                         request.cookies.has('supabase-auth-token');
      
      // If a session cookie exists, redirect to planning
      if (hasSession) {
        const planningUrl = new URL('/planung', request.url);
        return NextResponse.redirect(planningUrl);
      }
      
      // Otherwise, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Let client-side authentication handling take care of protected routes
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    
    // In case of error, redirect to env-check page
    const errorUrl = new URL('/env-check', request.url);
    return NextResponse.redirect(errorUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 