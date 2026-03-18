/**
 * hostTokenManager.js
 *
 * Manages host authorization tokens for LAN games.
 * Each token grants access to the Host Dashboard and protected game operations.
 * Tokens expire after a configurable TTL.
 */

'use strict';

const crypto = require('crypto');

class HostTokenManager {
  constructor(opts = {}) {
    this.tokens = new Map(); // token -> { createdAt, expiresAt, socketId?, isActive }
    this.TOKEN_LENGTH = 24; // 24 bytes = 48 hex chars
    this.TOKEN_TTL_MS = opts.tokenTtl || 600_000; // 10 minutes default
    this.CLEANUP_INTERVAL_MS = opts.cleanupInterval || 60_000; // Run cleanup every minute
    
    // Start cleanup job
    this.cleanupHandle = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Generate a new host token.
   * @returns {string} 48-character hex token
   */
  generateToken() {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const now = Date.now();
    
    this.tokens.set(token, {
      createdAt: now,
      expiresAt: now + this.TOKEN_TTL_MS,
      socketId: null, // Will be set when first used
      isActive: true,
    });
    
    return token;
  }

  /**
   * Validate a token and optionally bind it to a socket.
   * @param {string} token - The token to validate
   * @param {string} [socketId] - Socket ID to bind to (if validating on first use)
   * @returns {boolean} true if token is valid and active
   */
  validateToken(token, socketId = null) {
    if (!token || typeof token !== 'string') return false;
    
    const entry = this.tokens.get(token);
    if (!entry) return false;
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.tokens.delete(token);
      return false;
    }
    
    // Check if active
    if (!entry.isActive) return false;
    
    // Bind to socket on first use
    if (socketId && !entry.socketId) {
      entry.socketId = socketId;
    }
    
    // If already bound to a socket, only allow same socket
    if (entry.socketId && entry.socketId !== socketId) {
      return false;
    }
    
    return true;
  }

  /**
   * Invalidate a token (e.g., when host logs out).
   * @param {string} token
   */
  invalidateToken(token) {
    const entry = this.tokens.get(token);
    if (entry) {
      entry.isActive = false;
    }
  }

  /**
   * Get remaining TTL in milliseconds.
   * @param {string} token
   * @returns {number} milliseconds remaining, or 0 if expired/invalid
   */
  getTokenTtl(token) {
    const entry = this.tokens.get(token);
    if (!entry) return 0;
    
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Clean up expired tokens.
   */
  cleanup() {
    const now = Date.now();
    for (const [token, entry] of this.tokens.entries()) {
      if (now > entry.expiresAt || !entry.isActive) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Get token metrics for monitoring.
   * @returns {object}
   */
  getMetrics() {
    let active = 0;
    let expired = 0;
    
    const now = Date.now();
    for (const entry of this.tokens.values()) {
      if (now > entry.expiresAt || !entry.isActive) {
        expired++;
      } else {
        active++;
      }
    }
    
    return { active, expired, total: this.tokens.size };
  }

  /**
   * Shutdown the manager and stop cleanup jobs.
   */
  stop() {
    clearInterval(this.cleanupHandle);
  }
}

module.exports = { HostTokenManager };
