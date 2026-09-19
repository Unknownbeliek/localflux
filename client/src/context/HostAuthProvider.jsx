import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBackendUrl } from '../backendUrl';

const HostAuthContext = createContext();

export function HostAuthProvider({ children }) {
  const [hostToken, setHostTokenState] = useState(() => {
    return localStorage.getItem('lf_host_token') || '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isLocalhost = () => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1'
    );
  };

  const setHostToken = (token) => {
    if (token) {
      localStorage.setItem('lf_host_token', token);
      setHostTokenState(token);
    } else {
      localStorage.removeItem('lf_host_token');
      setHostTokenState('');
      setIsAuthenticated(false);
    }
  };

  const verifyToken = async (tokenToVerify) => {
    const token = tokenToVerify || hostToken;
    if (isLocalhost()) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    }

    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-host-token': token,
        },
      });
      const data = await response.json();
      if (data.ok) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.warn('[HostAuth] Token verification failed:', err);
    }

    setIsAuthenticated(false);
    setIsLoading(false);
    return false;
  };

  const loginWithPassword = async (password) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (data.ok && data.token) {
        setHostToken(data.token);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid password' };
    } catch (err) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

  return (
    <HostAuthContext.Provider
      value={{
        hostToken,
        isAuthenticated,
        isLoading,
        isLocalhost: isLocalhost(),
        setHostToken,
        loginWithPassword,
        verifyToken,
      }}
    >
      {children}
    </HostAuthContext.Provider>
  );
}

export function useHostAuth() {
  const context = useContext(HostAuthContext);
  if (!context) {
    throw new Error('useHostAuth must be used within a HostAuthProvider');
  }
  return context;
}
