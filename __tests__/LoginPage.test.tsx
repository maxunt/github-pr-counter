import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../app/page';
import { useAuth } from '../app/context/AuthContext';
import { useRouter } from 'next/navigation';

// Mock the necessary dependencies
jest.mock('../app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../app/components/GitHubAuth', () => {
  return function MockGitHubAuth() {
    return <div data-testid="github-auth">GitHub Auth Component</div>;
  };
});

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });
    
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
  });

  it('renders the login page with title and description', () => {
    render(<Home />);
    
    expect(screen.getByText(/GitHub PR Insights/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Track and analyze your GitHub pull requests metrics/i)
    ).toBeInTheDocument();
  });

  it('renders the GitHub Auth component when not loading', () => {
    render(<Home />);
    
    expect(screen.getByTestId('github-auth')).toBeInTheDocument();
  });

  it('displays loading state when checking login status', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });
    
    render(<Home />);
    
    expect(screen.getByText(/checking login status/i)).toBeInTheDocument();
    expect(screen.queryByTestId('github-auth')).not.toBeInTheDocument();
  });

  it('redirects to repo selection when user is authenticated', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
      isLoading: false,
    });
    
    render(<Home />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/repo-selection');
    });
  });

  it('does not redirect when user is not authenticated', () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });
    
    render(<Home />);
    
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('waits for loading to complete before redirecting authenticated user', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    // First render with loading state
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
      isLoading: true,
    });
    
    render(<Home />);
    
    // Should not redirect while loading
    expect(mockPush).not.toHaveBeenCalled();
    
    // Update the mock to simulate loading complete
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
      isLoading: false,
    });
    
    // Trigger a re-render
    render(<Home />);
    
    // Now should redirect
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/repo-selection');
    });
  });
});