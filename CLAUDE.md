# GitHub PR Counter Codebase Guide

## Project Overview
This project is a GitHub PR Counter website that:
- Authenticates users via GitHub OAuth through Supabase
- Allows users to view PR statistics for specified repositories
- Counts commits made by each user in the last month
- Features a login page and a stats viewing page
- Uses GitHub API to fetch repository data

## Development Approach
This project follows **Test-Driven Development** (TDD):
- Write tests first, then implement features
- Each component, utility, and API route should have corresponding tests
- Tests should cover both happy paths and error cases
- Run tests frequently during development

## Build, Lint, and Test Commands

```bash
# Development
npm run dev       # Start development server

# Build
npm run build     # Build for production

# Start
npm run start     # Start production server

# Linting
npm run lint      # Run ESLint

# Testing (TDD)
npm test          # Run all tests
npm test -- --watch  # Run tests in watch mode
npx jest <path-to-test-file>  # Run specific test file
npx jest -t "test name pattern"  # Run tests matching pattern
```

## File Patterns to Ignore
- `node_modules/**`
- `.next/**` 
- `coverage/**`

## Codebase Index

### Main Application Files
- `/app/layout.tsx` - Root layout with AuthProvider and metadata
- `/app/page.tsx` - Homepage with GitHub login
- `/app/repo-selection/page.tsx` - Repository selection and PR stats dashboard

### API Routes
- `/app/api/prs/route.ts` - Fetches repository PR metrics, handles caching
- `/app/api/my-prs/route.ts` - User-specific PR metrics
- `/app/api/setup-db/route.ts` - Database initialization

### Components
- `/app/components/GitHubAuth.tsx` - GitHub OAuth flow
- `/app/components/LoginStatus.tsx` - User authentication status display
- `/app/components/Toast.tsx` - Notification component

### Authentication
- `/app/context/AuthContext.tsx` - Auth state management
- `/app/auth/callback/route.ts` - OAuth callback handler
- `/middleware.ts` - Route protection middleware

### Database Integration
- `/lib/supabase.ts` - Client-side Supabase setup
- `/lib/supabase-server.ts` - Server-side Supabase client
- `/lib/types.ts` - TypeScript interfaces and types

### Test Files
- `/__tests__/GitHubAuth.test.tsx` - Authentication component tests
- `/__tests__/RepoSelection.test.tsx` - Repository selection page tests
- `/__tests__/api.test.ts` - API endpoint tests
- `/__tests__/components.test.tsx` - General component tests

## TDD Workflow
1. Write a failing test for the feature/component
2. Implement the minimum code to make the test pass
3. Refactor while keeping tests passing
4. Repeat for each new feature

## Code Style Guidelines

### Testing
- Use Jest and React Testing Library
- Mock external dependencies (API calls, Supabase)
- Test components in isolation
- Write descriptive test names: `describe('Component', () => it('should do something', () => {...})`

### Imports/Exports
- Group imports: React, external libraries, internal modules
- Client-side components must use 'use client' directive at the top
- Use named imports/exports when possible

### Types and TypeScript
- Use strict TypeScript (`"strict": true` in tsconfig.json)
- Type explicit return types for functions
- Prefer interfaces over types for objects
- Handle nullability with proper type guards

### Error Handling
- Use try/catch blocks for async operations
- Log errors with descriptive prefixes: `console.error('[Component] Error:', error)`
- Display user-friendly error messages via Toast components
- Validate API inputs and return clear error responses

### Component Structure
- React functional components with hooks
- Use context (AuthContext) for global state
- Follow Next.js App Router conventions
- Keep components focused on single responsibilities

### Naming and Formatting
- camelCase for variables/functions, PascalCase for components/types
- Consistent indentation (2 spaces)
- Max line length ~80 characters
- Descriptive variable/function names

## Project Guidelines (from .cursor/rules)
- Prefer simple solutions, avoid code duplication
- Consider all environments (dev/test/prod) when making changes
- Only mock data for tests, not for dev/prod
- Keep codebase clean and organized
- Tech stack: Next.js, React, TypeScript, Supabase, TailwindCSS
- Always validate changes with `npm run dev` and `npm run build`