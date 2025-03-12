import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log(`[Middleware] Request path: ${req.nextUrl.pathname}`);
  
  const res = NextResponse.next();
  
  // Create a standard Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const cookie = req.cookies.get(name);
          return cookie?.value;
        },
        set(name, value, options) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  try {
    // First check for our force auth bypass cookie
    const forceAuth = req.cookies.get('force_auth');
    
    // Check for our manually set token cookie
    const authToken = req.cookies.get('sb-auth-token');
    
    // Get the session from Supabase (this might fail if cookies aren't properly set)
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check auth debug cookies
    const authDebug = req.cookies.get('auth_debug');
    const authDebugTime = req.cookies.get('auth_debug_time');
    
    // Log all cookies for debugging
    console.log(`[Middleware] Cookies present:`, {
      'force_auth': !!forceAuth,
      'sb-auth-token': !!authToken,
      'auth_debug': authDebug?.value,
      'auth_debug_time': authDebugTime?.value,
      'cookie_count': req.cookies.getAll().length,
    });
    
    // If we have the force auth cookie, bypass all other checks
    if (forceAuth?.value === 'true' && req.nextUrl.pathname.startsWith('/repo-selection')) {
      console.log('[Middleware] Force auth cookie detected, bypassing authentication check');
      return res;
    }
    
    // Consider user authenticated if either method confirms it
    const isAuthenticated = !!(session || authToken?.value);
    
    console.log(`[Middleware] User authenticated: ${isAuthenticated}`, 
      session ? `via Supabase session: ${session.user.email}` : '',
      authToken ? `via manual token: ${authToken.value.substring(0, 10)}...` : '');
    
    // If authenticated user is on login page, redirect to repo selection
    if (isAuthenticated && req.nextUrl.pathname === '/') {
      console.log('[Middleware] User authenticated, redirecting to repo selection');
      const redirectUrl = new URL('/repo-selection', req.url);
      console.log(`[Middleware] Redirecting to: ${redirectUrl.toString()}`);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Prevent unauthenticated access to protected routes
    if (!isAuthenticated && req.nextUrl.pathname !== '/' && !req.nextUrl.pathname.startsWith('/auth/')) {
      console.log('[Middleware] No valid session trying to access protected route, redirecting to login page');
      
      // Create a custom response with debug information
      const redirectResponse = NextResponse.redirect(new URL('/', req.url));
      
      // Add a debug cookie to help diagnose the issue
      redirectResponse.cookies.set('auth_redirect_reason', 'no_valid_session', {
        path: '/',
        maxAge: 60 * 60,
        sameSite: 'lax',
      });
      
      redirectResponse.cookies.set('auth_redirect_time', new Date().toISOString(), {
        path: '/',
        maxAge: 60 * 60,
        sameSite: 'lax',
      });
      
      return redirectResponse;
    }

    return res;
  } catch (error) {
    console.error('[Middleware] Error in middleware:', error);
    return res;
  }
}

// Limit the middleware to specific routes
// Exclude direct-repo-selection to avoid middleware authentication check
export const config = {
  matcher: ['/', '/repo-selection', '/repo-selection/:path*'],
}; 