/**
 * ProtectedRoute.jsx
 *
 * Route wrapper that requires a valid host token.
 * Redirects to home if token is missing or expired.
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useHostToken } from '../context/HostTokenProvider'

/**
 * Protected route component.
 * Only renders the provided element if a valid host token is present.
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

  if (!isValid && !urlToken) {
    console.warn('[ProtectedRoute] Access denied - invalid or missing token')
    return <Navigate to="/" replace />
  }

  return element
}
