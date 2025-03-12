import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { GitHubPR } from '../../../lib/types';

// Define type for User PR metrics
interface UserPrMetrics {
  my_pr_count: number;
  my_additions: number;
  my_deletions: number;
  my_merged_count: number;
  my_open_count: number;
  my_closed_count: number;
}

// In-memory cache
const cache: Record<string, { data: UserPrMetrics, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const refresh = searchParams.get('refresh') === 'true';

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing owner or repo parameters' }, { status: 400 });
  }

  // Create Supabase client
  const supabase = createServerSupabaseClient();

  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const username = session.user.user_metadata?.user_name || session.user.user_metadata?.preferred_username;
    const repoFull = `${owner}/${repo}`;
    const cacheKey = `${userId}:${repoFull}:my-prs`;
    
    // Check cache first (unless refresh is requested)
    const now = Date.now();
    if (!refresh && cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL)) {
      return NextResponse.json(cache[cacheKey].data);
    }

    // Get GitHub token from session
    const token = session.provider_token;
    if (!token) {
      return NextResponse.json({ error: 'No GitHub token available' }, { status: 401 });
    }

    // Check if we have the username
    if (!username) {
      return NextResponse.json({ error: 'Unable to determine GitHub username' }, { status: 400 });
    }

    // Fetch PRs from GitHub
    let allPRs: GitHubPR[] = [];
    let page = 1;
    let hasMore = true;

    // Fetch all PRs with pagination
    while (hasMore) {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100&page=${page}`,
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
      if (prs.length === 0) {
        hasMore = false;
      } else {
        allPRs = allPRs.concat(prs);
        page++;
      }
    }

    // Filter PRs by the current user
    const myPRs = allPRs.filter(pr => pr.user.login.toLowerCase() === username.toLowerCase());

    // For each PR, fetch additional details if needed
    for (let i = 0; i < myPRs.length; i++) {
      const pr = myPRs[i];
      if (pr.additions === undefined || pr.deletions === undefined) {
        const detailResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (detailResponse.ok) {
          const detailedPR = await detailResponse.json();
          myPRs[i] = { ...pr, ...detailedPR };
        }
      }
    }

    // Calculate user-specific metrics
    const userMetrics: UserPrMetrics = {
      my_pr_count: myPRs.length,
      my_additions: myPRs.reduce((sum, pr) => sum + (pr.additions || 0), 0),
      my_deletions: myPRs.reduce((sum, pr) => sum + (pr.deletions || 0), 0),
      my_merged_count: myPRs.filter(pr => pr.merged_at).length,
      my_open_count: myPRs.filter(pr => pr.state === 'open').length,
      my_closed_count: myPRs.filter(pr => pr.state === 'closed' && !pr.merged_at).length
    };

    // Update cache
    cache[cacheKey] = {
      data: userMetrics,
      timestamp: now
    };

    return NextResponse.json(userMetrics);
  } catch (error) {
    console.error('Error fetching user PR data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch or process PR data' },
      { status: 500 }
    );
  }
} 