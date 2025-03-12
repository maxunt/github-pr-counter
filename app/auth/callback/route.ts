import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  console.log('[Auth Callback] Auth callback route triggered');
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  // Default next URL is our direct route to bypass potential middleware issues
  const next = searchParams.get('next') || '/direct-repo-selection';
  
  console.log(`[Auth Callback] Code present: ${!!code}, Next URL: ${next}`);

  if (code) {
    const cookieStore = cookies();
    console.log('[Auth Callback] Creating Supabase client');
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    console.log('[Auth Callback] Exchanging code for session');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('[Auth Callback] Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/?error=auth_callback_error', request.url));
    }
    
    if (data?.session) {
      console.log(`[Auth Callback] Session created successfully, user: ${data.session.user.email}`);
      
      // Create response with explicit redirect
      const response = NextResponse.redirect(new URL(next, request.url));
      
      // Add manual session cookie to ensure middleware can detect it
      response.cookies.set('sb-auth-token', data.session.access_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: 'lax',
        httpOnly: false, // Needed to be readable by client JS
      });
      
      // Add a debug cookie to track the auth flow
      response.cookies.set('auth_debug', 'callback_completed', { 
        path: '/',
        maxAge: 60 * 60,
        sameSite: 'lax',
      });
      
      // Add timestamp for debugging
      response.cookies.set('auth_debug_time', new Date().toISOString(), {
        path: '/',
        maxAge: 60 * 60,
        sameSite: 'lax',
      });
      
      console.log(`[Auth Callback] Session cookies set, redirecting to: ${next}`);
      console.log(`[Auth Callback] Access token: ${data.session.access_token.substring(0, 10)}...`);
      
      // Add a small delay to ensure cookies are properly set before redirect
      await new Promise(resolve => setTimeout(resolve, 800)); // Increased delay
      
      return response;
    }
  }

  console.log('[Auth Callback] No code or session, redirecting to home page');
  // Return to home page if code exchange fails
  return NextResponse.redirect(new URL('/', request.url));
} 