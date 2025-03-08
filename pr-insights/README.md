# GitHub PR Insights

A Next.js application that tracks and analyzes GitHub pull request metrics, helping developers understand their contribution patterns.

## Features

- GitHub OAuth authentication
- Pull request metrics (count, additions, deletions)
- Caching for optimized GitHub API usage
- Responsive UI with Tailwind CSS

## Prerequisites

Before you begin, you'll need:

- Node.js (v16 or newer)
- npm or yarn
- A GitHub account
- A Supabase account

## Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd pr-insights
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a GitHub OAuth App:
   - Go to GitHub Settings > Developer Settings > OAuth Apps > New OAuth App
   - Set the Homepage URL to `http://localhost:3000`
   - Set the Authorization callback URL to `http://localhost:3000/auth/callback`
   - Copy your Client ID and Client Secret

4. Create a Supabase project:
   - Go to [Supabase](https://supabase.com) and create a new project
   - In the Authentication settings, enable GitHub OAuth and enter your GitHub Client ID and Secret
   - Copy your Supabase URL and anon key

5. Create a `.env.local` file in the project root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Visit `http://localhost:3000` in your browser

## Using the Application

1. Sign in with your GitHub account
2. Enter a repository path in the format `owner/repo` (e.g., `octocat/hello-world`)
3. Click "Fetch PR Data" to analyze the repository
4. View the metrics for total PRs, lines added, and lines deleted

## Technologies Used

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase (Authentication, Database)
- GitHub API

## License

MIT
