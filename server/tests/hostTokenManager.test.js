/**
 * hostTokenManager.test.js
 *
 * Unit tests for host token management system.
 */

'use strict';

const assert = require('assert');
const { HostTokenManager } = require('../core/hostTokenManager');

describe('HostTokenManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new HostTokenManager({ tokenTtl: 1000, cleanupInterval: 5000 });
  });
  
  afterEach(() => {
    manager.stop();
  });

  describe('generateToken()', () => {
    it('should generate a valid token', () => {
      const token = manager.generateToken();
      
      assert(token, 'Token should not be empty');
      assert.strictEqual(typeof token, 'string', 'Token should be string');
      assert.strictEqual(token.length, 48, 'Token should be 48 hex chars (24 bytes)');
    });

    it('should generate unique tokens', () => {
      const token1 = manager.generateToken();
      const token2 = manager.generateToken();
      
      assert.notStrictEqual(token1, token2, 'Tokens should be unique');
    });

    it('should create token entry immediately', () => {
      const token = manager.generateToken();
      
      assert(manager.validateToken(token), 'Token should be valid immediately after generation');
    });
  });

  describe('validateToken()', () => {
    it('should validate a fresh token', () => {
      const token = manager.generateToken();
      
      assert(manager.validateToken(token), 'Fresh token should be valid');
    });

    it('should reject invalid token', () => {
      assert(!manager.validateToken('invalid'), 'Invalid token should be rejected');
      assert(!manager.validateToken(''), 'Empty token should be rejected');
      assert(!manager.validateToken(null), 'Null token should be rejected');
    });

    it('should reject expired token', async () => {
      const token = manager.generateToken();
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      assert(!manager.validateToken(token), 'Expired token should be rejected');
    });

    it('should bind token to socket on first use', () => {
      const token = manager.generateToken();
      const socketId = 'socket-123';
      
      const valid = manager.validateToken(token, socketId);
      assert(valid, 'Token should validate with socketId');
      
      // Should still validate with same socketId
      assert(manager.validateToken(token, socketId), 'Token should validate with same socketId');
    });

    it('should reject token if accessed from different socket', () => {
      const token = manager.generateToken();
      const socketId1 = 'socket-1';
      const socketId2 = 'socket-2';
      
      manager.validateToken(token, socketId1); // Bind to socket1
      
      assert(!manager.validateToken(token, socketId2), 'Token should not validate from different socket');
    });
  });

  describe('invalidateToken()', () => {
    it('should invalidate a token', () => {
      const token = manager.generateToken();
      
      assert(manager.validateToken(token), 'Token should be valid initially');
      
      manager.invalidateToken(token);
      
      assert(!manager.validateToken(token), 'Token should be invalid after invalidation');
    });

    it('should not error if invalidating non-existent token', () => {
      assert.doesNotThrow(() => {
        manager.invalidateToken('non-existent');
      }, 'Should not throw for non-existent token');
    });
  });

  describe('getTokenTtl()', () => {
    it('should return TTL for valid token', () => {
      const token = manager.generateToken();
      const ttl = manager.getTokenTtl(token);
      
      assert(ttl > 0, 'TTL should be positive');
      assert(ttl <= 1000, 'TTL should be within configured limit');
    });

    it('should return 0 for invalid token', () => {
      assert.strictEqual(manager.getTokenTtl('invalid'), 0, 'TTL should be 0 for invalid token');
    });

    it('should return 0 for expired token', async () => {
      const token = manager.generateToken();
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      assert.strictEqual(manager.getTokenTtl(token), 0, 'TTL should be 0 for expired token');
    });
  });

  describe('cleanup()', () => {
    it('should remove expired tokens', async () => {
      const token = manager.generateToken();
      
      assert(manager.validateToken(token), 'Token should be valid initially');
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      manager.cleanup();
      
      assert(!manager.validateToken(token), 'Expired token should be removed by cleanup');
    });

    it('should remove invalidated tokens', () => {
      const token = manager.generateToken();
      
      manager.invalidateToken(token);
      manager.cleanup();
      
      const metrics = manager.getMetrics();
      assert.strictEqual(metrics.active, 0, 'Invalidated tokens should be cleaned up');
    });
  });

  describe('getMetrics()', () => {
    it('should report token counts', () => {
      manager.generateToken();
      manager.generateToken();
      
      const metrics = manager.getMetrics();
      
      assert.strictEqual(metrics.active, 2, 'Should report 2 active tokens');
      assert.strictEqual(metrics.expired, 0, 'Should report 0 expired tokens');
      assert.strictEqual(metrics.total, 2, 'Should report 2 total tokens');
    });

    it('should report expired tokens', async () => {
      manager.generateToken();
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const metrics = manager.getMetrics();
      
      assert.strictEqual(metrics.expired, 1, 'Should report 1 expired token');
    });
  });
});
