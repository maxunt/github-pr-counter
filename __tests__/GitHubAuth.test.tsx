import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GitHubAuth from '../app/components/GitHubAuth';
import { useAuth } from '../app/context/AuthContext';

// Mock the useAuth hook
jest.mock('../app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock the Supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

// Mock the Next.js navigation hook
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

describe('GitHubAuth component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useAuth as jest.Mock).mockReturnValue({
      showToast: jest.fn(),
    });
  });

  it('renders a sign-in button', () => {
    render(<GitHubAuth />);
    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    expect(signInButton).toBeInTheDocument();
  });

  it('calls signInWithOAuth when button is clicked', () => {
    const { supabase } = require('../lib/supabase');
    
    render(<GitHubAuth />);
    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    
    fireEvent.click(signInButton);
    
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: {
        scopes: 'repo',
        redirectTo: expect.any(String),
      },
    });
  });

  it('shows loading state when authentication is in progress', () => {
    const { supabase } = require('../lib/supabase');
    // Mock implementation that doesn't resolve immediately
    supabase.auth.signInWithOAuth.mockImplementationOnce(() => {
      return new Promise(() => {});
    });
    
    render(<GitHubAuth />);
    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    
    fireEvent.click(signInButton);
    
    // Button should now show loading state
    expect(screen.getByText(/connecting to github/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('displays an error message when authentication fails', async () => {
    const { supabase } = require('../lib/supabase');
    const mockShowToast = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
    });
    
    // Mock a failed authentication
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: null,
      error: new Error('Authentication failed'),
    });
    
    render(<GitHubAuth />);
    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    
    fireEvent.click(signInButton);
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
    
    // Check if toast was called with error message
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Error logging in'),
      'error'
    );
  });

  it('handles errors from URL parameters', async () => {
    // Mock search params with an error
    const mockGet = jest.fn(param => param === 'error' ? 'access_denied' : null);
    require('next/navigation').useSearchParams.mockReturnValue({
      get: mockGet,
    });
    
    const mockShowToast = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
    });
    
    render(<GitHubAuth />);
    
    // Verify the error is displayed
    await waitFor(() => {
      expect(screen.getByText(/authentication failed: access_denied/i)).toBeInTheDocument();
    });
    
    // Verify toast was called
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Authentication error: access_denied'),
      'error'
    );
  });

  it('clears previous errors when starting a new login', async () => {
    // Start with an error state
    const mockGet = jest.fn(param => param === 'error' ? 'initial_error' : null);
    require('next/navigation').useSearchParams.mockReturnValue({
      get: mockGet,
    });
    
    const { supabase } = require('../lib/supabase');
    
    render(<GitHubAuth />);
    
    // Initial error should be displayed
    expect(screen.getByText(/authentication failed: initial_error/i)).toBeInTheDocument();
    
    // Click login button to start a new login flow
    const signInButton = screen.getByRole('button', { name: /sign in with github/i });
    fireEvent.click(signInButton);
    
    // Error message should be cleared
    expect(screen.queryByText(/authentication failed: initial_error/i)).not.toBeInTheDocument();
  });
}); 