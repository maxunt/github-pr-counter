'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';

// Define interface for PR metrics
interface PrMetrics {
  pr_count: number;
  total_additions: number;
  total_deletions: number;
}

export default function Dashboard() {
  const { user, isLoading, signOut, showToast } = useAuth();
  const [fetchLoading, setFetchLoading] = useState(false);
  const [repo, setRepo] = useState('');
  const [metrics, setMetrics] = useState<PrMetrics | null>(null);
  const router = useRouter();

  useEffect(() => {
    // If we're done loading and there's no user, redirect to login
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const fetchPRs = async () => {
    if (!repo || !repo.includes('/')) {
      showToast('Please enter a valid repository in the format owner/repo', 'error');
      return;
    }

    setFetchLoading(true);
    try {
      const [owner, repoName] = repo.split('/');
      
      // First try the app router API route
      let response = await fetch(`/api/prs?owner=${owner}&repo=${repoName}`);
      
      // If that fails, try the serverless function
      if (!response.ok && response.status === 500) {
        console.log('App router API failed, trying serverless function');
        response = await fetch(`/api/prs?owner=${owner}&repo=${repoName}`);
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch PR data');
      }
      
      const data = await response.json();
      setMetrics(data);
      showToast('PR data fetched successfully!', 'success');
    } catch (error) {
      console.error('Error fetching PRs:', error);
      showToast('Error fetching PR data. Please try again.', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // If no user and not loading, we'll redirect in the useEffect

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">GitHub PR Insights</h1>
          <div className="flex items-center">
            <div className="mr-4 flex items-center">
              {user?.user_metadata?.avatar_url && (
                <Image 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full mr-2"
                />
              )}
              <span className="font-medium">
                {user?.user_metadata?.user_name || user?.email || 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded p-4 shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter repository (e.g., owner/repo)"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="flex-grow p-2 border rounded"
            />
            <button
              onClick={fetchPRs}
              disabled={fetchLoading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center min-w-32"
            >
              {fetchLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching...
                </>
              ) : 'Fetch PR Data'}
            </button>
          </div>
        </div>
        
        {metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-bold mb-2">Total PRs</h2>
                <p className="text-3xl">{metrics.pr_count || 0}</p>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-bold mb-2">Lines Added</h2>
                <p className="text-3xl">{metrics.total_additions || 0}</p>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-bold mb-2">Lines Deleted</h2>
                <p className="text-3xl">{metrics.total_deletions || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 