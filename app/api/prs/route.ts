import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

// Define type for PR metrics
interface PrMetrics {
  pr_count: number;
  total_additions: number;
  total_deletions: number;
}

// Removed unused GitHubPr interface

// Removed unused cache and CACHE_TTL variables

// Remove the Edge runtime config as it might be causing compatibility issues
// export const config = {
//   runtime: 'edge',
// };

export async function GET(request: NextRequest) {
  console.log('API called: /api/prs');
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  console.log('Params received:', { owner, repo });

  if (!owner || !repo) {
    console.log('Missing owner or repo parameters');
    return NextResponse.json({ error: 'Missing owner or repo parameters' }, { status: 400 });
  }

  // Create Supabase client
  const supabase = createServerSupabaseClient();

  try {
    // Get user session with cookies from the request
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session found:', !!session);

    if (!session) {
      console.log('No authenticated session found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get GitHub token from session
    const token = session.provider_token;
    if (!token) {
      return NextResponse.json({ error: 'No GitHub token available' }, { status: 401 });
    }

    // Simplified version that only fetches a small number of PRs
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
      return NextResponse.json(
        { error: 'GitHub API error: ' + await response.text() },
        { status: response.status }
      );
    }

    const prs = await response.json();
    
    // Simple metrics - just count the PRs we received
    const metrics: PrMetrics = {
      pr_count: prs.length,
      total_additions: 0,
      total_deletions: 0
    };
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch or process PR data' },
      { status: 500 }
    );
  }
} 