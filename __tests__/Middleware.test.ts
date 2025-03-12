// Import the middleware function
import { middleware } from '../middleware';
import { NextRequest, NextResponse } from 'next/server';

// Mock Next.js modules
jest.mock('next/server', () => {
  // Define mock NextRequest
  class MockNextRequest {
    nextUrl: { pathname: string };
    url: string;
    cookies: any;
  
    constructor(url: string) {
      this.url = url;
      const parsedUrl = new URL(url);
      this.nextUrl = { pathname: parsedUrl.pathname };
      this.cookies = {
        get: jest.fn(),
        set: jest.fn(),
      };
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      next: jest.fn(() => ({
        cookies: {
          set: jest.fn(),
        },
      })),
      redirect: jest.fn((url) => ({
        url,
        cookies: {
          set: jest.fn(),
        },
      })),
    },
  };
});

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
  })),
}));

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
  });

  it('allows access to auth routes regardless of authentication', async () => {
    // Mock an unauthenticated session
    const { createServerClient } = require('@supabase/ssr');
    createServerClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    });
    
    // Create a mock request to auth route
    const { NextRequest } = require('next/server');
    const req = new NextRequest('https://example.com/auth/callback');
    
    // Add mock cookies methods
    req.cookies = {
      get: jest.fn().mockReturnValue({ value: 'test-cookie' }),
      set: jest.fn(),
    };
    
    // Call middleware
    const response = await middleware(req);
    
    // Should not redirect
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    // Mock an unauthenticated session
    const { createServerClient } = require('@supabase/ssr');
    createServerClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    });
    
    // Create a mock request to a protected route
    const { NextRequest } = require('next/server');
    const req = new NextRequest('https://example.com/repo-selection');
    
    // Add mock cookies methods
    req.cookies = {
      get: jest.fn().mockReturnValue({ value: 'test-cookie' }),
      set: jest.fn(),
    };
    
    // Call middleware
    await middleware(req);
    
    // Should redirect to login page
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/',
      })
    );
  });

  it('redirects authenticated users from login to repo-selection', async () => {
    // Mock an authenticated session
    const { createServerClient } = require('@supabase/ssr');
    createServerClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { 
            session: { 
              user: { email: 'test@example.com' },
              access_token: 'test-token',
            } 
          },
        }),
      },
    });
    
    // Create a mock request to the login route
    const { NextRequest } = require('next/server');
    const req = new NextRequest('https://example.com/');
    
    // Add mock cookies methods
    req.cookies = {
      get: jest.fn().mockReturnValue({ value: 'test-cookie' }),
      set: jest.fn(),
    };
    
    // Call middleware
    await middleware(req);
    
    // Should redirect to repo selection
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/repo-selection',
      })
    );
  });
  
  it('fails to redirect when session exists but redirection logic is broken', async () => {
    // Mock the NextResponse
    const { NextResponse } = require('next/server');
    const nextMock = jest.fn(() => ({ cookies: { set: jest.fn() } }));
    const redirectMock = jest.fn((url) => ({ 
      url,
      cookies: { set: jest.fn() } 
    }));
    NextResponse.next = nextMock;
    NextResponse.redirect = redirectMock;
    
    // Mock an authenticated session
    const { createServerClient } = require('@supabase/ssr');
    createServerClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { 
            session: { 
              user: { email: 'test@example.com' },
              access_token: 'test-token',
            } 
          },
        }),
      },
    });
    
    // Create a mock request to the root route
    const { NextRequest } = require('next/server');
    const req = new NextRequest('https://example.com/');
    req.nextUrl.pathname = '/';
    
    // Add mock cookies methods
    req.cookies = {
      get: jest.fn().mockReturnValue({ value: 'test-cookie' }),
      set: jest.fn(),
    };
    
    // Call middleware
    await middleware(req);
    
    // Debug what's happening
    console.log('Redirect mock called:', redirectMock.mock.calls);
    console.log('Next mock called:', nextMock.mock.calls);
    
    // Should redirect to repo-selection
    expect(redirectMock).toHaveBeenCalled();
    const redirectArg = redirectMock.mock.calls[0][0];
    expect(redirectArg.toString()).toContain('/repo-selection');
  });

  it('allows authenticated users to access protected routes', async () => {
    // Mock an authenticated session
    const { createServerClient } = require('@supabase/ssr');
    createServerClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { 
            session: { 
              user: { email: 'test@example.com' },
              access_token: 'test-token',
            } 
          },
        }),
      },
    });
    
    // Create a mock request to a protected route
    const { NextRequest } = require('next/server');
    const req = new NextRequest('https://example.com/repo-selection');
    
    // Add mock cookies methods
    req.cookies = {
      get: jest.fn().mockReturnValue({ value: 'test-cookie' }),
      set: jest.fn(),
    };
    
    // Call middleware
    const response = await middleware(req);
    
    // Should allow access
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
  });
});