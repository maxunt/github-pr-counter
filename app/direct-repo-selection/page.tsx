'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DirectRepoSelection() {
  const router = useRouter();

  useEffect(() => {
    // Set a force auth cookie to bypass middleware
    const setForceAuthCookie = () => {
      console.log('[DirectRoute] Setting force auth cookie to bypass middleware');
      const date = new Date();
      date.setTime(date.getTime() + 24 * 60 * 60 * 1000); // 1 day
      document.cookie = `force_auth=true; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
      
      // Redirect to actual page
      setTimeout(() => {
        router.push('/repo-selection');
      }, 100);
    };
    
    // Set the cookie immediately
    setForceAuthCookie();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main">
      <div className="text-center p-8 rounded-lg shadow-lg max-w-md w-full bg-bg-card border border-secondary-700">
        <h1 className="text-3xl font-bold mb-6 text-text-primary">Bypassing Middleware</h1>
        <p className="mb-8 text-text-secondary">
          Setting authentication cookies and redirecting you to the repository selection page...
        </p>
        <div className="flex justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 rounded-full border-t-transparent"></div>
        </div>
      </div>
    </div>
  );
}