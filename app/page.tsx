'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GitHubAuth from './components/GitHubAuth';
import { useAuth } from './context/AuthContext';

// UI component for loading spinner
const LoadingSpinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function Home() {
  const { user, isLoading, debugAuthState } = useAuth();
  const router = useRouter();

  // Check for our auth token cookie directly
  const checkAuthCookie = () => {
    if (typeof document === 'undefined') return false;
    
    return document.cookie
      .split('; ')
      .some(row => row.startsWith('sb-auth-token='));
  };

  // Force redirection if user is authenticated
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (!isLoading) {
        // Debug the current auth state
        const hasValidSession = await debugAuthState();
        const hasAuthCookie = checkAuthCookie();
        
        console.log('[HomePage] Auth check complete:', {
          hasValidSession,
          hasUser: !!user,
          hasAuthCookie
        });
        
        // Consider authenticated if any auth method is valid
        const isAuthenticated = !!(user || hasValidSession || hasAuthCookie);
        
        if (isAuthenticated) {
          console.log('[HomePage] User authenticated, redirecting to repo-selection');
          // Add a small delay to ensure cookies are properly synchronized
          setTimeout(() => {
            router.push('/repo-selection');
          }, 100);
        }
      }
    };
    
    checkAuthAndRedirect();
  }, [user, isLoading, router, debugAuthState]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-main" data-testid="home-page">
      <div className="text-center p-8 rounded-lg shadow-lg max-w-md w-full bg-bg-card border border-secondary-700">
        <h1 className="text-3xl font-bold mb-6 text-text-primary">GitHub PR Insights</h1>
        <p className="mb-8 text-text-secondary">
          Track and analyze your GitHub pull requests metrics. Login with your GitHub account to get started.
        </p>
        <div className="flex justify-center">
          {isLoading ? (
            <button
              disabled
              className="secondary-button px-6 py-3 rounded-md shadow-md flex items-center justify-center"
              data-testid="loading-button"
            >
              <LoadingSpinner />
              Checking login status...
            </button>
          ) : (
            <GitHubAuth />
          )}
        </div>
      </div>
    </main>
  );
}
