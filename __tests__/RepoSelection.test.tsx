import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RepoSelection from '../app/repo-selection/page';

// Mock the supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: {
                user_name: 'testuser',
              },
            },
            access_token: 'mock-access-token',
          },
        },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock the next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch function
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      pr_count: 10,
      total_additions: 1000,
      total_deletions: 500,
    }),
    text: () => Promise.resolve(''),
  })
);

// Mock the AuthContext
jest.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        user_name: 'testuser',
        avatar_url: 'https://example.com/avatar.png',
      },
    },
    isLoading: false,
    signOut: jest.fn().mockResolvedValue(null),
    showToast: jest.fn(),
  }),
}));

describe('RepoSelection', () => {
  it('renders repository selection form', () => {
    render(<RepoSelection />);
    expect(screen.getByText(/Select a GitHub Repository/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repository Owner/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repository Name/i)).toBeInTheDocument();
  });

  it('fetches PR data when form is submitted', async () => {
    render(<RepoSelection />);
    
    // Find the input fields and submit button
    const ownerInput = screen.getByLabelText(/Repository Owner/i);
    const repoInput = screen.getByLabelText(/Repository Name/i);
    const button = screen.getByText(/Fetch PR Insights/i);
    
    // Enter repo info and submit
    fireEvent.change(ownerInput, { target: { value: 'testuser' } });
    fireEvent.change(repoInput, { target: { value: 'testrepo' } });
    fireEvent.click(button);
    
    // Check that fetch was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/prs?owner=testuser&repo=testrepo`,
        expect.anything()
      );
    });
    
    // Check that metrics are displayed
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // PR count
      expect(screen.getByText('1,000')).toBeInTheDocument(); // Additions with thousand separator
      expect(screen.getByText('500')).toBeInTheDocument(); // Deletions
    });
  });
}); 