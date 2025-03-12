import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GET } from '../app/auth/callback/route';

// Add global Request implementation for the test environment
global.Request = class Request {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
};

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn(() => ({ headers: new Map() })),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock Supabase auth client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  })),
}));

describe('Auth Callback Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up cookie mock
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
    };
    (cookies as jest.Mock).mockReturnValue(mockCookieStore);
    
    // Mock setTimeout for the delay
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 123 as any;
    });
  });

  it('redirects to repo-selection with valid code and successful exchange', async () => {
    // Mock URL with code
    const mockUrl = 'https://example.com/auth/callback?code=valid-auth-code';
    const mockRequest = new Request(mockUrl);
    
    // Mock successful session exchange
    const mockSession = {
      user: { email: 'test@example.com', id: 'user-123' },
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
    };
    
    const { createRouteHandlerClient } = require('@supabase/auth-helpers-nextjs');
    createRouteHandlerClient.mockReturnValue({
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      },
    });
    
    // Call the handler
    await GET(mockRequest);
    
    // Verify redirect to repo-selection
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/repo-selection',
      })
    );
  });

  it('redirects to error page when code exchange fails', async () => {
    // Mock URL with code
    const mockUrl = 'https://example.com/auth/callback?code=invalid-code';
    const mockRequest = new Request(mockUrl);
    
    // Mock failed session exchange
    const { createRouteHandlerClient } = require('@supabase/auth-helpers-nextjs');
    createRouteHandlerClient.mockReturnValue({
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: { session: null },
          error: { message: 'Invalid code' },
        }),
      },
    });
    
    // Call the handler
    await GET(mockRequest);
    
    // Verify redirect with error
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/',
        search: expect.stringContaining('error=auth_callback_error'),
      })
    );
  });

  it('redirects to home page when no code is provided', async () => {
    // Mock URL without code
    const mockUrl = 'https://example.com/auth/callback';
    const mockRequest = new Request(mockUrl);
    
    // Call the handler
    await GET(mockRequest);
    
    // Verify redirect to home page
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/',
      })
    );
  });
});