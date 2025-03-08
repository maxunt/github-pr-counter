'use client';

import { useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [repo, setRepo] = useState('');

  const testBasicApi = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test?test=value');
      const data = await response.json();
      setResult({
        type: 'Basic API Test',
        status: response.status,
        data
      });
    } catch (error) {
      console.error('API test error:', error);
      setResult({
        type: 'Basic API Test',
        error: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const testPrApi = async () => {
    if (!repo || !repo.includes('/')) {
      setResult({
        type: 'PR API Test',
        error: 'Please enter a valid repository in the format owner/repo'
      });
      return;
    }

    setLoading(true);
    try {
      const [owner, repoName] = repo.split('/');
      const url = `/api/prs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}`;
      console.log('Testing URL:', url);
      
      const response = await fetch(url);
      let data;
      try {
        data = await response.json();
      } catch {
        // Ignoring parse error and using static message
        data = 'Could not parse JSON response';
      }
      
      setResult({
        type: 'PR API Test',
        status: response.status,
        url,
        data
      });
    } catch (error) {
      console.error('PR API test error:', error);
      setResult({
        type: 'PR API Test',
        error: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="mb-4">
        <button 
          onClick={testBasicApi}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Test Basic API
        </button>
      </div>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Enter repository (e.g., owner/repo)"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          className="p-2 border rounded mr-2"
        />
        <button 
          onClick={testPrApi}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Test PR API
        </button>
      </div>
      
      {loading && (
        <div className="my-4">
          Loading...
        </div>
      )}
      
      {result && (
        <div className="my-4">
          <h2 className="text-xl font-semibold mb-2">Test Result</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 