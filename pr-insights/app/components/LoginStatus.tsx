'use client';

import { useAuth } from '../context/AuthContext';

export default function LoginStatus() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <div className={`login-status ${user ? 'logged-in' : 'logged-out'}`}>
      <span className={`status-indicator ${user ? 'online' : 'offline'}`}></span>
      {user ? 'Logged in as ' + (user.user_metadata?.user_name || user.email || 'User') : 'Logged out'}
    </div>
  );
} 