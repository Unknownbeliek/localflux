/**
 * HostTokenProvider.jsx
 *
 * React Context for managing host authorization tokens.
 * Provides token storage, validation, and expiration tracking.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const HostTokenContext = createContext(null);

/**
 * Provider component for host token management.
 * Wraps the application to provide token context to child components.
 */
export function HostTokenProvider({ children }) {
  const [token, setToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  /**
   * Load token from URL params (for QR scan flow).
   * Called during component mount and when URL changes.
   */
  const loadTokenFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      setToken(urlToken);
      // Calculate expiration: assume 10-minute TTL from now
      setExpiresAt(Date.now() + 10 * 60 * 1000);
    }
  }, []);

  /**
   * Set token programmatically (e.g., from socket response).
   */
  const setHostToken = useCallback((newToken, ttlMs = 10 * 60 * 1000) => {
    const parsedTtl = Number(ttlMs);
    const safeTtlMs = Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 10 * 60 * 1000;
    setToken(newToken);
    const expiresIn = Date.now() + safeTtlMs;
    setExpiresAt(expiresIn);
  }, []);

  /**
   * Clear token (e.g., on logout or expiration).
   */
  const clearToken = useCallback(() => {
    setToken(null);
    setExpiresAt(null);
  }, []);

  /**
   * Check if token is still valid (not expired).
   */
  const isTokenValid = useCallback(() => {
    if (!token || !expiresAt) return false;
    return Date.now() < expiresAt;
  }, [token, expiresAt]);

  /**
   * Get remaining TTL in milliseconds.
   */
  const getTokenTtl = useCallback(() => {
    if (!expiresAt) return 0;
    const remaining = expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [expiresAt]);

  // Load token from URL on mount
  useEffect(() => {
    loadTokenFromUrl();
  }, [loadTokenFromUrl]);

  // Monitor token expiration and clear when expired
  useEffect(() => {
    if (!token || !expiresAt) return;

    const ttl = expiresAt - Date.now();
    if (ttl <= 0) {
      clearToken();
      return;
    }

    // Set timeout to clear token when it expires
    const timeout = setTimeout(() => {
      clearToken();
    }, ttl);

    return () => clearTimeout(timeout);
  }, [token, expiresAt, clearToken]);

  const value = {
    token,
    isValid: isTokenValid(),
    expiresAt,
    setHostToken,
    clearToken,
    getTokenTtl,
  };

  return (
    <HostTokenContext.Provider value={value}>
      {children}
    </HostTokenContext.Provider>
  );
}

/**
 * Hook to access host token context.
 * Must be used within a HostTokenProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useHostToken() {
  const context = useContext(HostTokenContext);
  if (!context) {
    throw new Error('useHostToken must be used within HostTokenProvider');
  }
  return context;
}
