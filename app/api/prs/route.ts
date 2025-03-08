import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

// Define type for cache data
interface CacheData {
  data: PrMetrics;
  timestamp: number;
}

// Define type for PR metrics
interface PrMetrics {
  pr_count: number;
  total_additions: number;
  total_deletions: number;
}

// Define interface for GitHub PR data
interface GitHubPr {
  number: number;
  additions: number;
  deletions: number;
  // Use more specific types for common GitHub PR properties
  id: number;
  title: string;
  user: {
    login: string;
    id: number;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  state: string;
  html_url: string;
  // Use Record for remaining properties
  [key: string]: unknown;
}

// In-memory cache
const cache: Record<string, CacheData> = {};
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Make sure to export the config for Vercel
export const config = {
  runtime: 'edge',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing owner or repo parameters' }, { status: 400 });
  }

  // Create Supabase client
  const supabase = createServerSupabaseClient();

  // Get user session with cookies from the request
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;
  const repoFull = `${owner}/${repo}`;
  const cacheKey = `${userId}:${repoFull}`;

  // Check cache first
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
    return NextResponse.json(cache[cacheKey].data);
  }

  // Check if we have data in the database (we'll implement this later)
  // For now, always fetch from GitHub

  // Get GitHub token from session
  const token = session.provider_token;
  if (!token) {
    return NextResponse.json({ error: 'No GitHub token available' }, { status: 401 });
  }

  try {
    // Fetch PRs from GitHub
    const allPRs: GitHubPr[] = [];
    let page = 1;
    let hasMore = true;

    // Check rate limit before starting
    const rateCheckResponse = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!rateCheckResponse.ok) {
      return NextResponse.json(
        { error: 'GitHub API error: ' + await rateCheckResponse.text() },
        { status: rateCheckResponse.status }
      );
    }
    
    const rateLimit = await rateCheckResponse.json();
    if (rateLimit.resources.core.remaining < 10) {
      return NextResponse.json(
        { error: 'GitHub API rate limit nearly reached' },
        { status: 429 }
      );
    }

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
        // For each PR, we need to fetch more details to get additions/deletions
        for (const pr of prs) {
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
            allPRs.push(detailedPR);
          } else {
            console.error(`Failed to get details for PR #${pr.number}`);
          }
        }
        
        page++;
      }
    }

    // Calculate metrics
    const prCount = allPRs.length;
    const totalAdditions = allPRs.reduce((sum, pr) => sum + (pr.additions || 0), 0);
    const totalDeletions = allPRs.reduce((sum, pr) => sum + (pr.deletions || 0), 0);

    const metrics = {
      pr_count: prCount,
      total_additions: totalAdditions,
      total_deletions: totalDeletions
    };

    // Update cache
    cache[cacheKey] = {
      data: metrics,
      timestamp: now
    };

    // Will save to database in a later step
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch or process PR data' },
      { status: 500 }
    );
  }
} 