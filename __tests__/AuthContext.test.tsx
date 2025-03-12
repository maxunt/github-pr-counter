import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../app/context/AuthContext';

// Mock the Supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      refreshSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Test component to access auth context
function TestComponent() {
  const { user, isLoading, showToast } = useAuth();
  
  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.id}` : 'Not logged in'}
      </div>
      <div data-testid="loading-status">
        {isLoading ? 'Loading...' : 'Ready'}
      </div>
      <button onClick={() => showToast('Test toast', 'info')}>Show Toast</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks to default behavior
    const { supabase } = require('../lib/supabase');
    supabase.auth.getSession.mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    });
  });

  it('initializes with no user and loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initially should be in loading state
    expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading...');
    
    // After initialization completes
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Ready');
    });
    
    expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
  });

  it('sets user when session exists', async () => {
    const { supabase } = require('../lib/supabase');
    
    // Mock an authenticated session
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { 
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {
              preferred_username: 'testuser'
            }
          },
          access_token: 'fake-token',
          refresh_token: 'fake-refresh-token'
        }
      },
      error: null
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test-user-id');
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Ready');
    });
    
    // Should have called setSession to ensure cookies are set
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'fake-token',
      refresh_token: 'fake-refresh-token'
    });
  });

  it('attempts to refresh session when no session exists', async () => {
    const { supabase } = require('../lib/supabase');
    
    // Initial getSession returns no session
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null
    });
    
    // But refreshSession succeeds
    supabase.auth.refreshSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'refreshed-user-id' },
          access_token: 'refreshed-token',
          refresh_token: 'refreshed-refresh-token'
        }
      },
      error: null
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as refreshed-user-id');
    });
    
    expect(supabase.auth.refreshSession).toHaveBeenCalled();
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'refreshed-token',
      refresh_token: 'refreshed-refresh-token'
    });
  });

  it('displays toast messages', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Ready');
    });
    
    // Trigger toast
    act(() => {
      screen.getByRole('button').click();
    });
    
    // Toast should be visible
    expect(screen.getByText('Test toast')).toBeInTheDocument();
  });

  it('sets up and cleans up auth listener', async () => {
    const { supabase } = require('../lib/supabase');
    const mockUnsubscribe = jest.fn();
    
    supabase.auth.onAuthStateChange.mockReturnValueOnce({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    });
    
    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Ready');
    });
    
    // Verify listener was set up
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    
    // Unmount to trigger cleanup
    unmount();
    
    // Verify unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('handles sign out', async () => {
    const { supabase } = require('../lib/supabase');
    
    // Mock component that can trigger sign out
    function SignOutComponent() {
      const { signOut } = useAuth();
      return <button onClick={signOut}>Sign Out</button>;
    }
    
    // Set up with a logged-in user
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id' },
          access_token: 'fake-token',
          refresh_token: 'fake-refresh-token'
        }
      },
      error: null
    });
    
    render(
      <AuthProvider>
        <TestComponent />
        <SignOutComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test-user-id');
    });
    
    // Trigger sign out
    act(() => {
      screen.getByRole('button', { name: 'Sign Out' }).click();
    });
    
    // Verify signOut was called with global scope
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    
    // Simulate auth state change event
    const authStateCallback = supabase.auth.onAuthStateChange.mock.calls[0][0];
    act(() => {
      authStateCallback('SIGNED_OUT', null);
    });
    
    // User should now be logged out
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
    
    // Should show toast for successful logout
    expect(screen.getByText('Successfully logged out')).toBeInTheDocument();
  });
});