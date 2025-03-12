// PR data types for the GitHub API
export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    id: number;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string;
}

// PR metrics types
export interface PrMetrics {
  id?: number;
  user_id?: string;
  repository?: string;
  pr_count: number;
  total_additions: number;
  total_deletions: number;
  created_at?: string;
  updated_at?: string;
}

// User PR metrics types
export interface UserPrMetrics {
  my_pr_count: number;
  my_additions: number;
  my_deletions: number;
  my_merged_count: number;
  my_open_count: number;
  my_closed_count: number;
} 