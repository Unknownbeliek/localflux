import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

/**
 * Validates if the current hostname is a local machine
 */
const isLocalhost = () => {
  const hostname = window.location.hostname
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    // Also include IPv6 loopback without brackets if browser formats it that way
    hostname === '::1'
  )
}

/**
 * LocalhostBouncer Component
 * 
 * Route barrier that completely locks down admin/host routes.
 * Checks if the user is accessing the app via localhost IP. 
 * If accessing via network IP (e.g., 192.168.x.x), silently redirects to /play.
 * 
 * Can be used as a Wrapper: <LocalhostBouncer><ProtectedComponent /></LocalhostBouncer>
 * Or as a Layout Route: <Route element={<LocalhostBouncer />}> <Route ... /> </Route>
 */
export function LocalhostBouncer({ children }) {
  if (!isLocalhost()) {
    console.warn('[LocalhostBouncer] Access from network IP blocked, redirecting to /play')
    return <Navigate to="/play" replace />
  }

  // Support both component wrapping AND React Router Outlet (Layout routes)
  return children ? children : <Outlet />
}
