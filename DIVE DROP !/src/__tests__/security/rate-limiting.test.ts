/**
 * Rate Limiting Tests
 * Tests for the rate limiting middleware and functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  RATE_LIMIT_CONFIGS,
  clearRateLimit,
} from '@/lib/security/rate-limiter';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    ['admin-login:127.0.0.1', 'user:test@example.com'].forEach((key) => {
      clearRateLimit(key);
    });
  });

  describe('Admin Login Rate Limiting', () => {
    it('should allow initial login attempts', () => {
      const identifier = 'admin-login:127.0.0.1';
      const config = RATE_LIMIT_CONFIGS.adminLogin;

      const result = checkRateLimit(identifier, config);
      expect(result.isLimited).toBe(false);
      expect(result.attempts).toBe(0);
    });

    it('should track failed attempts', () => {
      const identifier = 'admin-login:127.0.0.1';
      const config = RATE_LIMIT_CONFIGS.adminLogin;

      // Record 3 failed attempts
      for (let i = 0; i < 3; i++) {
        const result = recordFailedAttempt(identifier, config);
        expect(result.attempts).toBe(i + 1);
        expect(result.isNowLocked).toBe(false);
      }

      // Check status
      const status = checkRateLimit(identifier, config);
      expect(status.isLimited).toBe(false);
      expect(status.attempts).toBe(3);
    });

    it('should lock account after max attempts (5 attempts)', () => {
      const identifier = 'admin-login:127.0.0.1';
      const config = RATE_LIMIT_CONFIGS.adminLogin;

      // Record max attempts
      let lockResult;
      for (let i = 0; i < config.maxAttempts; i++) {
        lockResult = recordFailedAttempt(identifier, config);
      }

      expect(lockResult!.isNowLocked).toBe(true);
      expect(lockResult!.lockedUntil).toBeDefined();

      // Check that account is now locked
      const status = checkRateLimit(identifier, config);
      expect(status.isLimited).toBe(true);
      expect(status.message).toContain('Rate limit exceeded');
    });

    it('should reset attempts after successful login', () => {
      const identifier = 'admin-login:127.0.0.1';
      const config = RATE_LIMIT_CONFIGS.adminLogin;

      // Record some failures
      recordFailedAttempt(identifier, config);
      recordFailedAttempt(identifier, config);

      // Reset on success
      recordSuccessfulAttempt(identifier);

      // Attempts should be reset
      const status = checkRateLimit(identifier, config);
      expect(status.attempts).toBe(0);
      expect(status.isLimited).toBe(false);
    });

    it('should provide remaining time when locked', () => {
      const identifier = 'admin-login:127.0.0.1';
      const config = RATE_LIMIT_CONFIGS.adminLogin;

      // Lock account
      for (let i = 0; i < config.maxAttempts; i++) {
        recordFailedAttempt(identifier, config);
      }

      // Check remaining time
      const status = checkRateLimit(identifier, config);
      expect(status.isLimited).toBe(true);
      expect(status.remainingTime).toBeGreaterThan(0);
      expect(status.remainingTime).toBeLessThanOrEqual(config.lockoutMs);
    });
  });

  describe('Different Rate Limit Configs', () => {
    it('should use correct limits for auth endpoint', () => {
      const config = RATE_LIMIT_CONFIGS.authEndpoint;
      expect(config.maxAttempts).toBe(10);
      expect(config.windowMs).toBe(5 * 60 * 1000);
      expect(config.lockoutMs).toBe(5 * 60 * 1000);
    });

    it('should use correct limits for API endpoint', () => {
      const config = RATE_LIMIT_CONFIGS.apiEndpoint;
      expect(config.maxAttempts).toBe(30);
      expect(config.windowMs).toBe(60 * 1000);
      expect(config.lockoutMs).toBe(60 * 1000);
    });
  });

  describe('Multiple Identifiers', () => {
    it('should track different identifiers independently', () => {
      const id1 = 'admin-login:127.0.0.1';
      const id2 = 'admin-login:192.168.1.1';
      const config = RATE_LIMIT_CONFIGS.adminLogin;

      // Record failures for first identifier
      recordFailedAttempt(id1, config);
      recordFailedAttempt(id1, config);

      // Record failures for second identifier
      recordFailedAttempt(id2, config);

      // Check statuses
      const status1 = checkRateLimit(id1, config);
      const status2 = checkRateLimit(id2, config);

      expect(status1.attempts).toBe(2);
      expect(status2.attempts).toBe(1);
    });
  });
});
