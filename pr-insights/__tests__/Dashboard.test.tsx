import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../app/dashboard/page';

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
    json: () => Promise.resolve({
      pr_count: 10,
      total_additions: 1000,
      total_deletions: 500,
    }),
  })
);

describe('Dashboard', () => {
  it('renders loading state initially', () => {
    render(<Dashboard />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches PR data when form is submitted', async () => {
    render(<Dashboard />);
    
    // Wait for the initial loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Find the input and button
    const input = screen.getByPlaceholderText(/enter repository/i);
    const button = screen.getByText(/fetch pr data/i);
    
    // Enter repo info and submit
    fireEvent.change(input, { target: { value: 'testuser/testrepo' } });
    fireEvent.click(button);
    
    // Check that fetch was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/prs?owner=testuser&repo=testrepo',
        expect.anything()
      );
    });
    
    // Check that metrics are displayed
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // PR count
      expect(screen.getByText('1000')).toBeInTheDocument(); // Additions
      expect(screen.getByText('500')).toBeInTheDocument(); // Deletions
    });
  });
}); 