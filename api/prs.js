// This is a dedicated Vercel serverless function that can be used if the App Router API route doesn't work
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { owner, repo } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo parameters' });
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Get user session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Get GitHub token from session
  const token = session.provider_token;
  if (!token) {
    return res.status(401).json({ error: 'No GitHub token available' });
  }

  try {
    // Check rate limit
    const rateCheckResponse = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!rateCheckResponse.ok) {
      return res.status(rateCheckResponse.status).json({ 
        error: 'GitHub API error: ' + await rateCheckResponse.text() 
      });
    }
    
    // Simplified version just to test if the API works
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=10&page=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'GitHub API error: ' + await response.text() 
      });
    }

    const prs = await response.json();
    
    // Simple metrics
    const metrics = {
      pr_count: prs.length,
      total_additions: 0,
      total_deletions: 0
    };

    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return res.status(500).json({ error: 'Failed to fetch or process PR data' });
  }
} 