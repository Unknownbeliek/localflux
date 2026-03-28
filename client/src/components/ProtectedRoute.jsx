/**
 * ProtectedRoute.jsx
 *
 * Route wrapper that requires a valid host token.
 * Redirects to home if token is missing or expired.
 * Allows localhost users without a token for local development.
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useHostToken } from '../context/HostTokenProvider'

/**
 * Check if user is accessing from local network
 */
const isLocalNetwork = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') // includes 172.16.0.0/12 private block
  )
}

/**
 * Protected route component.
 * Only renders the provided element if a valid host token is present,
 * OR if accessing from localhost (for development).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.element - Component to render if authorized
 * @returns {React.ReactNode} Element or redirect to home
 */
export function ProtectedRoute({ element }) {
  const { isValid, setHostToken } = useHostToken()
  const urlToken =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null

  React.useEffect(() => {
    if (!isValid && urlToken) {
      setHostToken(urlToken)
    }
  }, [isValid, urlToken, setHostToken])

  // Allow local network access without token (for development/local quiz generation)
  if (isLocalNetwork()) {
    return element
  }

  // For network access, require a valid token
  if (!isValid && !urlToken) {
    console.warn('[ProtectedRoute] Access denied - invalid or missing token')
    return <Navigate to="/" replace />
  }

  return element
}
