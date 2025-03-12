import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with secure authentication
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: {
        // Use cookies for storage to ensure middleware can access the session
        getItem: (key) => {
          // When in browser, get from cookies
          if (typeof document !== 'undefined') {
            const value = document.cookie
              .split('; ')
              .find((row) => row.startsWith(`${key}=`))
              ?.split('=')[1];
            return value ? decodeURIComponent(value) : null;
          }
          return null;
        },
        setItem: (key, value) => {
          // When in browser, set in cookies
          if (typeof document !== 'undefined') {
            const date = new Date();
            // Set an expiry date 12 hours from now
            date.setTime(date.getTime() + 12 * 60 * 60 * 1000);
            document.cookie = `${key}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
          }
        },
        removeItem: (key) => {
          // When in browser, remove from cookies
          if (typeof document !== 'undefined') {
            document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
          }
        },
      },
    }
  }
); 