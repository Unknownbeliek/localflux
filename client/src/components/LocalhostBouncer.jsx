import React from 'react';
import { Outlet } from 'react-router-dom';
import { useHostAuth } from '../context/HostAuthProvider';
import { HostLoginModal } from './HostLoginModal';

/**
 * LocalhostBouncer Component v2.0.0
 * 
 * Auto-grants host access when running on localhost / 127.0.0.1 (offline LAN mode).
 * Renders HostLoginModal when accessing from a remote domain (online mode) until authenticated.
 */
export function LocalhostBouncer({ children }) {
  const { isLocalhost, isAuthenticated, isLoading } = useHostAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-sm text-slate-400">Verifying session...</div>
      </div>
    );
  }

  if (isLocalhost || isAuthenticated) {
    return children ? children : <Outlet />;
  }

  return <HostLoginModal />;
}
