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
  };
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (session?.user) {
          // Only show login success if we just logged in (check localStorage)
          const justLoggedIn = localStorage.getItem('just_logged_in');
          if (justLoggedIn) {
            setToast({ message: 'Successfully logged in!', type: 'success' });
            localStorage.removeItem('just_logged_in');
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      
      if (event === 'SIGNED_IN') {
        setToast({ message: 'Successfully logged in!', type: 'success' });
        localStorage.setItem('just_logged_in', 'true');
      } else if (event === 'SIGNED_OUT') {
        setToast({ message: 'Successfully logged out', type: 'info' });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, showToast, signOut }}>
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