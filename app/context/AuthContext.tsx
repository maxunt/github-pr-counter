'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from '../components/Toast';

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    user_name?: string;
    avatar_url?: string;
    preferred_username?: string;
  };
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  signOut: () => Promise<void>;
  debugAuthState: () => Promise<boolean>;  // Now returns whether a session exists
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Function to log current auth state
  const debugAuthState = async () => {
    console.log('[AuthContext] ===== DEBUG AUTH STATE =====');
    console.log('[AuthContext] Current user state:', user ? {
      id: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
    } : 'No user');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AuthContext] Current session from Supabase:', 
        session ? { 
          user: session.user.email,
          accessToken: session.access_token ? `${session.access_token.substring(0, 10)}...` : 'none',
          expiresAt: new Date(session.expires_at! * 1000).toISOString(),
          refreshToken: session.refresh_token ? 'present' : 'missing'
        } : 'No session');
      
      // Check cookies directly
      const supabaseCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('supabase-auth-token='));
      
      console.log('[AuthContext] Auth cookie present:', !!supabaseCookie);
    } catch (error) {
      console.error('[AuthContext] Error checking session:', error);
    }
    
    console.log('[AuthContext] Loading state:', isLoading);
    console.log('[AuthContext] ============================');
    
    // Return if session exists for conditional logic
    return !!(await supabase.auth.getSession()).data.session;
  };

  useEffect(() => {
    console.log('[AuthContext] AuthProvider mounted, checking user session');
    
    const checkUser = async () => {
      try {
        // First check if we have our custom auth cookie
        const hasAuthCookie = typeof document !== 'undefined' ? 
          document.cookie.split('; ').some(row => row.startsWith('sb-auth-token=')) : 
          false;
        
        console.log('[AuthContext] Auth cookie check:', hasAuthCookie ? 'Auth cookie found' : 'No auth cookie');
        
        // Fetch session from Supabase
        console.log('[AuthContext] Fetching session from Supabase');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Error fetching session:', error);
        }
        
        console.log('[AuthContext] Session response:', session ? 'Session found' : 'No session');
        
        // Set directly from auth cookie if Supabase session isn't available
        if (!session?.user && hasAuthCookie) {
          console.log('[AuthContext] No Supabase session but auth cookie found, setting up manual authentication');
          
          // Try to get the user data
          const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('[AuthContext] Error fetching user:', userError);
          }
          
          if (userData) {
            console.log('[AuthContext] Successfully retrieved user data from cookie auth');
            setUser(userData);
          } else {
            console.log('[AuthContext] Auth cookie present but unable to retrieve user data');
          }
        } else if (session?.user) {
          console.log('[AuthContext] User found in session:', {
            id: session.user.id,
            email: session.user.email,
            userMetadata: session.user.user_metadata,
          });
          
          setUser(session.user);
          
          // Set custom auth cookie if it doesn't exist
          if (!hasAuthCookie && typeof document !== 'undefined') {
            console.log('[AuthContext] Setting custom auth cookie');
            const date = new Date();
            date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
            document.cookie = `sb-auth-token=${session.access_token}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
          }
          
          // Ensure session is set in cookies for server-side middleware
          // This synchronizes the client-side session with what the middleware expects
          console.log('[AuthContext] Setting session in cookies for server-side middleware');
          const setSessionResult = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          
          if (setSessionResult.error) {
            console.error('[AuthContext] Error setting session:', setSessionResult.error);
          } else {
            console.log('[AuthContext] Session successfully set');
          }
        } else {
          console.log('[AuthContext] No user in session, setting user to null');
          setUser(null);
          
          // Try to refresh the session if there's no session
          console.log('[AuthContext] Trying to refresh session');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('[AuthContext] Error refreshing session:', refreshError);
          } else if (refreshData.session) {
            console.log('[AuthContext] Session refreshed, user found:', refreshData.session.user);
            setUser(refreshData.session.user);
            
            // Set the refreshed session in cookies
            console.log('[AuthContext] Setting refreshed session in cookies');
            await supabase.auth.setSession({
              access_token: refreshData.session.access_token,
              refresh_token: refreshData.session.refresh_token,
            });
          } else {
            console.log('[AuthContext] No session after refresh attempt');
          }
        }
      } catch (err) {
        console.error('[AuthContext] Unexpected error in checkUser:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Set up auth state change listener
    console.log('[AuthContext] Setting up auth state change listener');
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Auth state changed: ${event}`);
      console.log('[AuthContext] New session:', session ? 'Session exists' : 'No session');
      
      if (session?.user) {
        console.log('[AuthContext] User details:', {
          id: session.user.id,
          email: session.user.email,
          userMetadata: session.user.user_metadata,
        });
      }
      
      setUser(session?.user || null);
      
      if (event === 'SIGNED_IN') {
        console.log('[AuthContext] User signed in, setting toast');
        setToast({ message: 'Successfully logged in!', type: 'success' });
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out, setting toast');
        setToast({ message: 'Successfully logged out', type: 'info' });
      } else if (event === 'USER_UPDATED') {
        console.log('[AuthContext] User profile updated');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed');
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    console.log(`[AuthContext] Showing toast: ${type} - ${message}`);
    setToast({ message, type });
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out user');
    try {
      // Use the scope 'global' to remove session data from all browsers/tabs
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
      } else {
        console.log('[AuthContext] Sign out successful');
        // Clear user state
        setUser(null);
        // Clear any session storage
        sessionStorage.removeItem('selectedRepo');
        // Set a small delay to allow cookies to be cleared before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('[AuthContext] Exception during sign out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, showToast, signOut, debugAuthState }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 