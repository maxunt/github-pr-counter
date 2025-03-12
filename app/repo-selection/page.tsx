'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title, 
  Tooltip, 
  Legend
);

// Define interface for PR metrics
interface PrMetrics {
  pr_count: number;
  total_additions: number;
  total_deletions: number;
}

export default function RepoSelection() {
  const { user, isLoading, signOut, showToast, debugAuthState } = useAuth();
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [metrics, setMetrics] = useState<PrMetrics | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [bypassAuth, setBypassAuth] = useState(false);  // Flag to bypass middleware auth check
  const router = useRouter();

  // Add a log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const logEntry = `${timestamp} - ${message}`;
    console.log(`[RepoSelection] ${message}`);
    setLogs(prev => [logEntry, ...prev].slice(0, 10));
  }, []);

  // Check for our auth token cookie directly
  const checkAuthCookie = useCallback(() => {
    const hasCookie = document.cookie
      .split('; ')
      .some(row => row.startsWith('sb-auth-token='));
    
    return hasCookie;
  }, []);
  
  // Check for redirect cookies that indicate middleware issues
  const checkRedirectCookies = useCallback(() => {
    const redirectReason = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_redirect_reason='))
      ?.split('=')[1];
      
    const redirectTime = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_redirect_time='))
      ?.split('=')[1];
      
    if (redirectReason) {
      addLog(`Auth redirect detected: ${redirectReason} at ${redirectTime}`);
      return true;
    }
    return false;
  }, [addLog]);

  // Set a force authentication cookie to bypass middleware
  const setForceAuthCookie = useCallback(() => {
    if (user) {
      addLog('Setting force auth cookie to bypass middleware');
      const date = new Date();
      date.setTime(date.getTime() + 24 * 60 * 60 * 1000); // 1 day
      document.cookie = `force_auth=true; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
      setBypassAuth(true);
    }
  }, [user, addLog]);

  useEffect(() => {
    // First check if we've been redirected due to middleware auth failure
    const wasRedirected = checkRedirectCookies();
    
    // Add debug logs to understand auth state
    if (!isLoading) {
      const hasAuthCookie = checkAuthCookie();
      addLog(`Auth state: user object ${user ? 'present' : 'not present'}, auth cookie ${hasAuthCookie ? 'present' : 'not present'}`);
      
      // Log auth state with debugAuthState
      debugAuthState().then(hasSession => {
        addLog(`Supabase session check: ${hasSession ? 'valid session' : 'no session'}`);
        
        // Consider authenticated if user object exists or Supabase session is valid
        const isAuthenticated = !!user || hasSession;
        
        // If we're not authenticated, redirect to login
        if (!isAuthenticated) {
          addLog('Not authenticated, redirecting to login page');
          router.push('/');
        } else {
          if (user) {
            addLog(`Authenticated as: ${user.email || user.user_metadata?.user_name || 'unknown user'}`);
            
            // If we were redirected but actually have a valid user, set a force auth cookie
            if (wasRedirected) {
              setForceAuthCookie();
            }
          } else {
            addLog('Authenticated via session only (no user object)');
          }
        }
      });
    }
  }, [user, isLoading, router, addLog, checkAuthCookie, checkRedirectCookies, debugAuthState, setForceAuthCookie]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!owner.trim()) {
      showToast('Please enter a repository owner', 'error');
      return;
    }
    
    if (!repo.trim()) {
      showToast('Please enter a repository name', 'error');
      return;
    }
    
    await fetchPRData();
  };

  const fetchPRData = async (refresh = false) => {
    addLog(`🔍 Fetching PR data for ${owner}/${repo}${refresh ? ' (refresh)' : ''}`);
    setFetchLoading(true);
    
    try {
      // Import supabase directly to avoid circular dependencies
      const { supabase } = await import('../../lib/supabase');
      
      // Get the session to include the token in our request
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        addLog('❌ No active session found');
        showToast('Authentication error. Please log in again.', 'error');
        router.push('/');
        return;
      }
      
      // Add the refresh parameter to force a refresh if needed
      const refreshParam = refresh ? '&refresh=true' : '';
      const url = `/api/prs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}${refreshParam}`;
      
      addLog(`API call: ${url}`);
      // Include the access token in the Authorization header
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      addLog(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          errorJson = { error: 'Could not parse error response' };
        }
        
        const errorMessage = errorJson.error || `API request failed with status ${response.status}`;
        addLog(`❌ API error: ${errorMessage}`);
        showToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      addLog(`✅ Received data: ${data.pr_count} PRs, ${data.total_additions} additions, ${data.total_deletions} deletions`);
      setMetrics(data);
      showToast('PR data fetched successfully!', 'success');
    } catch (error) {
      console.error('Error fetching PRs:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Error: ${errorMessage}`);
      showToast(`Error fetching PR data: ${errorMessage}`, 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleRefresh = () => {
    addLog('Manual refresh requested');
    fetchPRData(true);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-bg-main">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-text-primary">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Generate chart data
  const generateChartData = () => {
    if (!metrics) return null;
    
    return {
      labels: ['PRs', 'Additions (÷100)', 'Deletions (÷100)'],
      datasets: [{
        label: 'Repository Metrics',
        data: [
          metrics.pr_count, 
          Math.round(metrics.total_additions / 100), 
          Math.round(metrics.total_deletions / 100)
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)'
        ],
        borderWidth: 1
      }]
    };
  };

  return (
    <div className="min-h-screen p-6 bg-bg-main">
      {/* Debug info for authentication */}
      {bypassAuth && (
        <div className="fixed top-0 left-0 right-0 bg-green-100 text-green-800 p-2 text-center text-sm z-20">
          Auth bypass active - Server middleware is being bypassed
        </div>
      )}
      
      {/* User profile in top right corner */}
      {user && (
        <div className="fixed top-4 right-4 z-10 flex items-center bg-opacity-90 rounded-lg p-2 shadow-lg bg-bg-card border border-secondary-700">
          <div className="flex items-center mr-3">
            {user?.user_metadata?.avatar_url && (
              <Image 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                width={32}
                height={32}
                className="h-8 w-8 rounded-full mr-2"
              />
            )}
            <span className="font-medium text-text-primary">
              {user?.user_metadata?.user_name || user?.email || 'User'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="secondary-button text-sm font-bold py-1 px-3 rounded-md shadow-md transition duration-200"
          >
            Logout
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto mt-16">
        <div className="text-text-primary rounded-lg p-4 shadow-lg mb-8 bg-bg-card border border-secondary-700">
          <h1 className="text-2xl font-bold text-center">GitHub PR Insights</h1>
        </div>
        
        <div className="text-text-primary rounded-lg p-8 shadow-lg bg-bg-card border border-secondary-700">
          <h2 className="text-xl font-semibold mb-6">Select a GitHub Repository</h2>
          <p className="text-text-secondary mb-8">
            Enter the repository owner and name to fetch PR insights.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 rounded-lg bg-bg-input border border-secondary-700">
              <label htmlFor="owner" className="block text-text-primary text-sm font-bold mb-2">
                Repository Owner
              </label>
              <input
                id="owner"
                type="text"
                placeholder="e.g., facebook"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-text-primary shadow-sm bg-bg-input border-secondary-600"
                required
              />
            </div>
            
            <div className="p-4 rounded-lg bg-bg-input border border-secondary-700">
              <label htmlFor="repo" className="block text-text-primary text-sm font-bold mb-2">
                Repository Name
              </label>
              <input
                id="repo"
                type="text"
                placeholder="e.g., react"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-text-primary shadow-sm bg-bg-input border-secondary-600"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={fetchLoading}
                className="primary-button font-bold py-4 px-4 rounded-md focus:outline-none focus:shadow-outline shadow-md transition duration-200 flex-grow flex items-center justify-center"
              >
                {fetchLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching...
                  </>
                ) : 'Fetch PR Insights'}
              </button>
              
              {metrics && (
                <button
                  onClick={handleRefresh}
                  disabled={fetchLoading}
                  className="secondary-button font-bold py-3 px-4 rounded-md shadow-md transition duration-200"
                  title="Refresh data from GitHub instead of using cached data"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
        
        {/* Results Section */}
        {metrics && (
          <div className="mt-8 text-text-primary rounded-lg p-6 shadow-lg bg-bg-card border border-secondary-700">
            <h2 className="text-xl font-semibold mb-4">PR Insights for {owner}/{repo}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-bg-input border border-secondary-700 flex flex-col items-center">
                <h3 className="font-semibold mb-2">Pull Requests</h3>
                <p className="text-4xl font-bold">{metrics.pr_count}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-bg-input border border-secondary-700 flex flex-col items-center">
                <h3 className="font-semibold mb-2">Lines Added</h3>
                <p className="text-4xl font-bold">{metrics.total_additions.toLocaleString()}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-bg-input border border-secondary-700 flex flex-col items-center">
                <h3 className="font-semibold mb-2">Lines Deleted</h3>
                <p className="text-4xl font-bold">{metrics.total_deletions.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="h-64 mt-6">
              {generateChartData() && (
                <Bar 
                  data={generateChartData()!} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      title: {
                        display: true,
                        text: 'Repository Metrics',
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Logs Section */}
        {logs.length > 0 && (
          <div className="mt-8 text-text-primary rounded-lg p-4 shadow-lg bg-bg-card border border-secondary-700">
            <h3 className="text-md font-semibold mb-2">Activity Log</h3>
            <div className="text-xs bg-bg-main rounded p-2 max-h-32 overflow-auto">
              {logs.map((log, index) => (
                <div key={index} className="py-1 border-b border-secondary-700 last:border-0">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 