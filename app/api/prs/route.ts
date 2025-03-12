import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { GitHubPR } from '../../../lib/types';

// Define type for PR metrics
interface PrMetrics {
  id?: number;
  user_id?: string;
  repository?: string;
  pr_count: number;
  total_additions: number;
  total_deletions: number;
  created_at?: string;
  updated_at?: string;
}

// In-memory cache for faster responses
const cache: Record<string, { data: PrMetrics, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache duration

// Remove the Edge runtime config as it might be causing compatibility issues
// export const config = {
//   runtime: 'edge',
// };

export async function GET(request: NextRequest) {
  console.log('[API:prs] API called with URL:', request.url);
  
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const refresh = searchParams.get('refresh') === 'true';
  
  console.log('[API:prs] Request parameters:', { owner, repo, refresh });

  if (!owner || !repo) {
    console.log('[API:prs] Missing required parameters');
    return NextResponse.json({ error: 'Missing owner or repo parameters' }, { status: 400 });
  }

  // Create Supabase client
  console.log('[API:prs] Creating Supabase client');
  const supabase = createServerSupabaseClient();

  try {
    // Check for Authorization header first
    const authHeader = request.headers.get('Authorization');
    let session;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('[API:prs] Found Authorization header, using token');
      const token = authHeader.substring(7);
      
      // Use the token to get the session
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('[API:prs] Error authenticating with token:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      
      if (!data.user) {
        console.log('[API:prs] No user found with provided token');
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      
      console.log('[API:prs] User authenticated via token:', data.user.id);
      session = { user: data.user };
    } else {
      // Fallback to cookie-based session
      console.log('[API:prs] No Authorization header, falling back to cookie-based session');
      const { data: { session: cookieSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[API:prs] Session error:', sessionError);
        return NextResponse.json({ error: 'Error getting session' }, { status: 500 });
      }
      
      session = cookieSession;
    }
    
    console.log('[API:prs] Session found:', !!session);
    
    if (!session) {
      console.log('[API:prs] No authenticated session found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[API:prs] User ID:', userId);
    console.log('[API:prs] User email:', session.user.email);
    
    const repoFull = `${owner}/${repo}`;
    const cacheKey = `${userId}:${repoFull}`;
    
    // Check cache first (unless refresh is requested)
    const now = Date.now();
    if (!refresh && cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL)) {
      console.log('[API:prs] Returning cached PR metrics');
      return NextResponse.json(cache[cacheKey].data);
    }
    
    // Check if metrics exist in database
    console.log('[API:prs] Checking database for existing metrics');
    const { data: existingMetrics, error: metricsError } = await supabase
      .from('pr_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('repository', repoFull)
      .single();
    
    if (metricsError && metricsError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('[API:prs] Error fetching metrics from database:', metricsError);
    } else if (existingMetrics) {
      console.log('[API:prs] Found existing metrics in database:', existingMetrics);
    } else {
      console.log('[API:prs] No existing metrics found in database');
    }
    
    // If metrics exist and refresh is not requested, return them
    if (existingMetrics && !refresh) {
      console.log('[API:prs] Returning metrics from database');
      // Update cache
      cache[cacheKey] = {
        data: existingMetrics,
        timestamp: now
      };
      return NextResponse.json(existingMetrics);
    }

    // Get GitHub token from session
    const token = session.provider_token;
    if (!token) {
      console.error('[API:prs] No GitHub token in session');
      return NextResponse.json({ error: 'No GitHub token available' }, { status: 401 });
    }
    
    console.log('[API:prs] GitHub token available, starting API calls');

    // Fetch PRs from GitHub
    // eslint-disable-next-line prefer-const
    let allPRs: GitHubPR[] = [];
    let page = 1;
    let hasMore = true;
    
    // Check rate limit before starting
    console.log('[API:prs] Checking GitHub API rate limit');
    const rateCheckResponse = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!rateCheckResponse.ok) {
      const errorText = await rateCheckResponse.text();
      console.error('[API:prs] Rate limit check failed:', errorText);
      return NextResponse.json(
        { error: 'GitHub API error: ' + errorText },
        { status: rateCheckResponse.status }
      );
    }
    
    const rateLimit = await rateCheckResponse.json();
    console.log('[API:prs] Rate limit remaining:', rateLimit.resources.core.remaining);
    
    if (rateLimit.resources.core.remaining < 10) {
      console.warn('[API:prs] Rate limit nearly reached');
      return NextResponse.json({ error: 'GitHub API rate limit nearly reached' }, { status: 429 });
    }

    // Fetch all PRs with pagination
    console.log('[API:prs] Starting PR fetch with pagination');
    while (hasMore) {
      console.log(`[API:prs] Fetching page ${page}`);
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
        const errorText = await response.text();
        console.error(`[API:prs] GitHub API error on page ${page}:`, errorText);
        return NextResponse.json(
          { error: 'GitHub API error: ' + errorText },
          { status: response.status }
        );
      }

      const prs = await response.json();
      console.log(`[API:prs] Received ${prs.length} PRs from page ${page}`);
      
      if (prs.length === 0) {
        console.log('[API:prs] No more PRs to fetch');
        hasMore = false;
      } else {
        // For each PR, we need to fetch more details to get additions/deletions
        console.log('[API:prs] Fetching details for individual PRs');
        for (const pr of prs) {
          console.log(`[API:prs] Fetching details for PR #${pr.number}`);
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
            console.log(`[API:prs] PR #${pr.number}: +${detailedPR.additions || 0}, -${detailedPR.deletions || 0}`);
            allPRs.push(detailedPR);
          } else {
            console.error(`[API:prs] Failed to get details for PR #${pr.number}`);
          }
        }
        
        page++;
      }
    }

    // Calculate metrics
    console.log('[API:prs] Calculating metrics from collected PRs');
    const prCount = allPRs.length;
    const totalAdditions = allPRs.reduce((sum, pr) => sum + (pr.additions || 0), 0);
    const totalDeletions = allPRs.reduce((sum, pr) => sum + (pr.deletions || 0), 0);

    const metrics: PrMetrics = {
      user_id: userId,
      repository: repoFull,
      pr_count: prCount,
      total_additions: totalAdditions,
      total_deletions: totalDeletions
    };
    
    console.log('[API:prs] Calculated metrics:', metrics);

    // Save metrics to database (upsert)
    console.log('[API:prs] Saving metrics to database');
    const { error: upsertError } = await supabase
      .from('pr_metrics')
      .upsert({
        user_id: userId,
        repository: repoFull,
        pr_count: metrics.pr_count,
        total_additions: metrics.total_additions,
        total_deletions: metrics.total_deletions,
        updated_at: new Date().toISOString()
      })
      .select();

    if (upsertError) {
      console.error('[API:prs] Error saving metrics to database:', upsertError);
    } else {
      console.log('[API:prs] Metrics saved to database successfully');
    }
    
    // Update cache
    console.log('[API:prs] Updating cache');
    cache[cacheKey] = {
      data: metrics,
      timestamp: now
    };
    
    console.log('[API:prs] Returning new metrics');
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[API:prs] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch or process PR data' },
      { status: 500 }
    );
  }
} 