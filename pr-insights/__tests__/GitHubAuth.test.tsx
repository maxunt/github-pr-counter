import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GitHubAuth from '../app/components/GitHubAuth';

// Mock the Supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('GitHubAuth component', () => {
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
    expect(screen.getByRole('button')).toHaveTextContent(/loading/i);
    expect(screen.getByRole('button')).toBeDisabled();
  });
}); 