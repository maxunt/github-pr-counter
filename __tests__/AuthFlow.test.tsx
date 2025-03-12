import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../app/context/AuthContext';
import Home from '../app/page';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

// Mock necessary dependencies
jest.mock('../app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({ get: jest.fn() })),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      setSession: jest.fn(),
    },
  },
}));

// Mock GitHubAuth component
jest.mock('../app/components/GitHubAuth', () => {
  return function MockGitHubAuth() {
    return <div data-testid="github-auth">GitHub Auth Component</div>;
  };
});

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /repo-selection when already logged in', async () => {
    // Mock router
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock authenticated user
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
      isLoading: false,
      debugAuthState: jest.fn(),
    });

    render(<Home />);

    // Verify it redirects to repo selection page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/repo-selection');
    });
  });

  it('shows GitHubAuth component when not logged in', () => {
    // Mock user not logged in
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      debugAuthState: jest.fn(),
    });

    render(<Home />);

    // Should show login screen
    expect(screen.getByText(/GitHub PR Insights/)).toBeInTheDocument();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    // GitHubAuth is mocked, but we can check the container is rendered
    expect(screen.queryByTestId('loading-button')).not.toBeInTheDocument();
  });

  it('shows loading state during authentication check', () => {
    // Mock loading state
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
      debugAuthState: jest.fn(),
    });

    render(<Home />);

    // Should show loading indicator
    expect(screen.getByTestId('loading-button')).toBeInTheDocument();
    expect(screen.getByText(/Checking login status/)).toBeInTheDocument();
  });

  it('avoids premature redirection during loading', () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    // Mock loading state with user
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
      isLoading: true, // Still loading
      debugAuthState: jest.fn(),
    });

    render(<Home />);

    // Should not redirect while still loading
    expect(mockPush).not.toHaveBeenCalled();
  });
});