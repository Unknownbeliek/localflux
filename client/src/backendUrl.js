import { io } from 'socket.io-client';

const FALLBACK_PORT = '3000';

function trimTrailingSlash(url) {
  return url ? url.replace(/\/$/, '') : '';
}

export function getBackendUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL?.trim();
  if (envUrl) return trimTrailingSlash(envUrl);

  if (typeof window !== 'undefined' && window.location?.hostname) {
    // If running on a Vercel/cloud domain without VITE_BACKEND_URL set, default to same origin without custom port
    const isStandardWebPort = window.location.port === '' || window.location.port === '80' || window.location.port === '443';
    if (isStandardWebPort && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.hostname}`;
    }
    return `${window.location.protocol}//${window.location.hostname}:${FALLBACK_PORT}`;
  }

  return `http://localhost:${FALLBACK_PORT}`;
}

export function createGameSocket(customOptions = {}) {
  const hostToken = typeof localStorage !== 'undefined' ? localStorage.getItem('lf_host_token') || '' : '';
  
  return io(getBackendUrl(), {
    transports: ['websocket', 'polling'],
    auth: {
      token: hostToken,
    },
    extraHeaders: {
      'x-host-token': hostToken,
    },
    ...customOptions,
  });
}