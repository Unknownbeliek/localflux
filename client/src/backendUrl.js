import { io } from 'socket.io-client';

const FALLBACK_PORT = '7218';

function trimTrailingSlash(url) {
  return url.replace(/\/$/, '');
}

export function getBackendUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL?.trim();
  if (envUrl) return trimTrailingSlash(envUrl);

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${FALLBACK_PORT}`;
  }

  return `http://localhost:${FALLBACK_PORT}`;
}

export function createGameSocket() {
  return io(getBackendUrl(), { transports: ['websocket'] });
}