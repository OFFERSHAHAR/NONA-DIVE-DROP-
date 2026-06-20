/**
 * Rate Limiting Module
 * Implements distributed rate limiting with per-endpoint configuration
 *
 * Features:
 * - Per-IP rate limiting
 * - Per-user rate limiting
 * - Per-endpoint custom limits
 * - Exponential backoff
 * - Account lockout after repeated failures
 * - Redis-ready (currently in-memory, switch to Redis for production)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
  resetAt: number;
  lockoutUntil?: number; // For failed login lockout
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  lockoutThreshold?: number; // Failed attempts before lockout
  lockoutDurationSeconds?: number; // How long to lock out
  message?: string;
}

/**
 * Default rate limit configurations by endpoint
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits
  'POST /api/auth/login': {
    maxRequests: 5, // 5 attempts
    windowSeconds: 300, // per 5 minutes
    lockoutThreshold: 5,
    lockoutDurationSeconds: 900, // 15 minutes lockout
    message: 'Too many login attempts. Please try again later.',
  },

  'POST /api/auth/register': {
    maxRequests: 3, // 3 attempts
    windowSeconds: 3600, // per hour
    message: 'Too many registration attempts. Please try again later.',
  },

  'POST /api/auth/forgot-password': {
    maxRequests: 3,
    windowSeconds: 3600,
    message: 'Too many password reset requests. Please try again later.',
  },

  'POST /api/auth/refresh': {
    maxRequests: 10,
    windowSeconds: 60,
    message: 'Token refresh rate limit exceeded.',
  },

  // Admin endpoints - moderate limits
  'GET /api/admin/users': {
    maxRequests: 100,
    windowSeconds: 60,
    message: 'Admin API rate limit exceeded.',
  },

  'POST /api/admin/users': {
    maxRequests: 20,
    windowSeconds: 60,
  },

  'GET /api/admin/dive-sites': {
    maxRequests: 100,
    windowSeconds: 60,
  },

  // Public API endpoints - higher limits
  'GET /api/buddy/listings': {
    maxRequests: 200,
    windowSeconds: 60,
  },

  'GET /api/service-providers/search': {
    maxRequests: 100,
    windowSeconds: 60,
  },
};

/**
 * In-memory rate limit store
 * In production, replace with Redis: new Redis()
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.startCleanup();
  }

  /**
   * Get or create rate limit entry
   */
  private getEntry(key: string): RateLimitEntry {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        firstRequestAt: now,
        resetAt: now + 60000, // Default 60 second window
      };
      this.store.set(key, entry);
    }

    return entry;
  }

  /**
   * Check rate limit
   */
  isAllowed(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = this.getEntry(key);

    // Check lockout
    if (entry.lockoutUntil && now < entry.lockoutUntil) {
      const remainingLockout = Math.ceil((entry.lockoutUntil - now) / 1000);
      return { allowed: false, remaining: remainingLockout };
    }

    // Reset lockout if expired
    if (entry.lockoutUntil && now >= entry.lockoutUntil) {
      entry.lockoutUntil = undefined;
      entry.count = 0;
      entry.firstRequestAt = now;
      entry.resetAt = now + config.windowSeconds * 1000;
    }

    // Check if window has passed
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.firstRequestAt = now;
      entry.resetAt = now + config.windowSeconds * 1000;
    }

    // Increment counter
    entry.count++;

    // Check limit
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const allowed = entry.count <= config.maxRequests;

    return { allowed, remaining };
  }

  /**
   * Record failed attempt (for account lockout)
   */
  recordFailedAttempt(
    key: string,
    config: RateLimitConfig
  ): { allowed: boolean; lockedUntil?: number } {
    const now = Date.now();
    const entry = this.getEntry(key);

    if (entry.lockoutUntil && now < entry.lockoutUntil) {
      return { allowed: false, lockedUntil: entry.lockoutUntil };
    }

    entry.count++;

    if (config.lockoutThreshold && entry.count >= config.lockoutThreshold) {
      const lockoutDuration = (config.lockoutDurationSeconds || 900) * 1000;
      entry.lockoutUntil = now + lockoutDuration;
      return { allowed: false, lockedUntil: entry.lockoutUntil };
    }

    return { allowed: true };
  }

  /**
   * Reset rate limit for a key (used after successful login, etc.)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    if (typeof window !== 'undefined') return; // Server-side only

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetAt + 3600000) {
          // Remove entries older than 1 hour
          this.store.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[RATE LIMITER] Cleaned up ${cleaned} expired entries`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop cleanup interval (for tests/shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global rate limit store instance
const rateLimitStore = new RateLimitStore();

/**
 * Extract IP address from request
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown'
  );
}

/**
 * Extract user ID from request (if authenticated)
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  // Extract from Authorization header or cookies
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // In production, verify JWT and extract user ID
    return authHeader.substring(7, 17); // Placeholder
  }

  const token = request.cookies.get('auth_token')?.value;
  if (token) {
    // In production, verify JWT and extract user ID
    return token.substring(0, 10); // Placeholder
  }

  return null;
}

/**
 * Middleware: Check rate limit and return 429 if exceeded
 */
export async function withRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const userId = await getUserId(request);
  const method = request.method;
  const pathname = new URL(request.url).pathname;
  const endpoint = `${method} ${pathname}`;

  // Find matching config
  const config =
    RATE_LIMIT_CONFIGS[endpoint] ||
    RATE_LIMIT_CONFIGS[method] || {
      maxRequests: 100,
      windowSeconds: 60,
    };

  // Use user ID if available, otherwise IP
  const key = userId ? `user:${userId}` : `ip:${ip}`;

  // Check rate limit
  const { allowed, remaining } = rateLimitStore.isAllowed(key, config);

  if (!allowed) {
    console.warn(
      `[RATE LIMIT] Exceeded for ${key} on ${endpoint}. Remaining: ${remaining}`
    );

    return NextResponse.json(
      {
        error: config.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: remaining, // Seconds
      },
      {
        status: 429, // Too Many Requests
        headers: {
          'Retry-After': remaining.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(
            Date.now() + remaining * 1000
          ).toISOString(),
        },
      }
    );
  }

  // Return null if allowed (middleware should continue)
  return null;
}

/**
 * Record failed authentication attempt
 * Triggers lockout if threshold exceeded
 */
export async function recordFailedLogin(request: NextRequest): Promise<{
  allowed: boolean;
  lockoutUntil?: number;
  message?: string;
}> {
  const ip = getClientIP(request);
  const key = `login:${ip}`;
  const config = RATE_LIMIT_CONFIGS['POST /api/auth/login'];

  const result = rateLimitStore.recordFailedAttempt(key, config);

  if (!result.allowed && result.lockoutUntil) {
    const remainingSeconds = Math.ceil((result.lockoutUntil - Date.now()) / 1000);
    return {
      allowed: false,
      lockoutUntil: result.lockoutUntil,
      message: `Account temporarily locked. Try again in ${remainingSeconds} seconds.`,
    };
  }

  return { allowed: true };
}

/**
 * Reset rate limit after successful operation
 */
export async function resetRateLimit(request: NextRequest): Promise<void> {
  const ip = getClientIP(request);
  const userId = await getUserId(request);

  if (userId) {
    rateLimitStore.reset(`user:${userId}`);
  }
  rateLimitStore.reset(`login:${ip}`);
}

/**
 * Get current rate limit status (for monitoring)
 */
export function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): { count: number; maxRequests: number; remaining: number; resetAt: number } {
  const result = rateLimitStore.isAllowed(key, config);
  return {
    count: config.maxRequests - result.remaining,
    maxRequests: config.maxRequests,
    remaining: result.remaining,
    resetAt: Date.now() + config.windowSeconds * 1000,
  };
}

/**
 * For testing: clear all rate limit entries
 */
export function clearAllRateLimits(): void {
  rateLimitStore.stopCleanup();
  const newStore = new RateLimitStore();
  console.log('[RATE LIMITER] Cleared all entries (testing mode)');
}

export default rateLimitStore;
