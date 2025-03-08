'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GitHubAuth from './components/GitHubAuth';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6">GitHub PR Insights</h1>
        <p className="mb-8 text-gray-600">
          Track and analyze your GitHub pull requests metrics. Login with your GitHub account to get started.
        </p>
        <div className="flex justify-center">
          {isLoading ? (
            <button
              disabled
              className="bg-blue-300 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
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
