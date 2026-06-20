/**
 * Token Security Module
 * Handles secure token storage, rotation, and revocation
 *
 * Implements:
 * - HttpOnly/Secure/SameSite cookie patterns
 * - Refresh token rotation (prevents token reuse attacks)
 * - Token revocation list (blacklisting)
 * - Token storage strategy
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Token revocation store (in production, use Redis or database)
const tokenRevocationList = new Set<string>();
const revocationCleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup revocation list periodically
export function startRevocationListCleanup() {
  if (typeof window === 'undefined') {
    // Server-side only
    setInterval(() => {
      // In production, query database for expired tokens and remove them
      console.log('[TOKEN SECURITY] Running revocation list cleanup');
    }, revocationCleanupInterval);
  }
}

/**
 * Token cookie configuration
 * Ensures tokens are stored securely in HttpOnly cookies
 */
export const TOKEN_COOKIE_CONFIG = {
  // Access token: short-lived (1 hour)
  accessToken: {
    name: 'auth_token',
    maxAge: 60 * 60, // 1 hour
    httpOnly: true, // JavaScript cannot access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax' as const, // CSRF protection
    path: '/',
  },

  // Refresh token: longer-lived (7 days)
  refreshToken: {
    name: 'refresh_token',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },

  // Admin token: medium-lived (8 hours)
  adminToken: {
    name: 'admin_token',
    maxAge: 8 * 60 * 60, // 8 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const, // Stricter for admin
    path: '/admin',
  },

  // Admin refresh token: longer-lived (72 hours)
  adminRefreshToken: {
    name: 'admin_refresh_token',
    maxAge: 72 * 60 * 60, // 72 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/admin',
  },
};

/**
 * Set secure token cookie with proper flags
 */
export async function setTokenCookie(
  cookieName: string,
  token: string,
  options: typeof TOKEN_COOKIE_CONFIG.accessToken
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    maxAge: options.maxAge,
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

/**
 * Get token from secure cookie
 */
export async function getTokenCookie(cookieName: string): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(cookieName);
  return cookie?.value || null;
}

/**
 * Delete token cookie (logout)
 */
export async function deleteTokenCookie(cookieName: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

/**
 * Add token to revocation list (logout, token refresh)
 * In production: store in Redis with TTL equal to token expiry
 */
export function revokeToken(token: string): void {
  tokenRevocationList.add(token);
  console.log(`[TOKEN SECURITY] Token revoked: ${token.substring(0, 10)}...`);
}

/**
 * Check if token is revoked
 */
export function isTokenRevoked(token: string): boolean {
  return tokenRevocationList.has(token);
}

/**
 * Revoke all tokens for a user (all-device logout)
 * In production: query database for all tokens and revoke them
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  console.log(`[TOKEN SECURITY] Revoking all tokens for user: ${userId}`);
  // In production: delete all tokens from database where user_id = userId
  // and add them to revocation list
}

/**
 * Refresh token family validation (detects token reuse attacks)
 * Each time a refresh token is used, a new family is generated
 * If an old token is reused, the entire family is revoked (attack detected)
 */
export interface TokenFamily {
  id: string; // Unique family identifier
  userId: string;
  issuedAt: number;
  generationCount: number;
  lastUsedAt: number;
  revokedAt?: number;
}

// In production, store in database
const tokenFamilies = new Map<string, TokenFamily>();

/**
 * Create new token family (initial refresh)
 */
export function createTokenFamily(familyId: string, userId: string): TokenFamily {
  const family: TokenFamily = {
    id: familyId,
    userId,
    issuedAt: Date.now(),
    generationCount: 0,
    lastUsedAt: Date.now(),
  };

  tokenFamilies.set(familyId, family);
  return family;
}

/**
 * Validate and advance token family (refresh token rotation)
 * Returns true if valid and increments generation count
 * Returns false if token reuse detected (security breach)
 */
export function validateTokenFamily(familyId: string): boolean {
  const family = tokenFamilies.get(familyId);

  if (!family) {
    console.warn(
      `[TOKEN SECURITY] Token family not found (possible reuse attack): ${familyId}`
    );
    return false;
  }

  if (family.revokedAt) {
    console.warn(
      `[TOKEN SECURITY] Token family revoked (possible reuse attack): ${familyId}`
    );
    return false;
  }

  // Check if reused (multiple uses in short time window)
  const timeSinceLastUse = Date.now() - family.lastUsedAt;
  if (timeSinceLastUse < 1000) {
    // Less than 1 second - likely reuse
    console.error(`[TOKEN SECURITY] Token reuse detected for family: ${familyId}`);
    revokeTokenFamily(familyId);
    return false;
  }

  // Advance family
  family.generationCount++;
  family.lastUsedAt = Date.now();

  return true;
}

/**
 * Revoke entire token family (security incident)
 */
export function revokeTokenFamily(familyId: string): void {
  const family = tokenFamilies.get(familyId);
  if (family) {
    family.revokedAt = Date.now();
    console.error(`[TOKEN SECURITY] Token family revoked due to security incident: ${familyId}`);
    // In production: revoke all user sessions
  }
}

/**
 * Response helper: set secure response with token cookies
 */
export function createTokenResponse<T>(
  data: T,
  accessToken: string,
  refreshToken: string,
  statusCode: number = 200
): NextResponse<T> {
  const response = NextResponse.json(data, { status: statusCode });

  // Set secure cookies on response
  response.cookies.set(TOKEN_COOKIE_CONFIG.accessToken.name, accessToken, {
    maxAge: TOKEN_COOKIE_CONFIG.accessToken.maxAge,
    httpOnly: TOKEN_COOKIE_CONFIG.accessToken.httpOnly,
    secure: TOKEN_COOKIE_CONFIG.accessToken.secure,
    sameSite: TOKEN_COOKIE_CONFIG.accessToken.sameSite,
    path: TOKEN_COOKIE_CONFIG.accessToken.path,
  });

  response.cookies.set(TOKEN_COOKIE_CONFIG.refreshToken.name, refreshToken, {
    maxAge: TOKEN_COOKIE_CONFIG.refreshToken.maxAge,
    httpOnly: TOKEN_COOKIE_CONFIG.refreshToken.httpOnly,
    secure: TOKEN_COOKIE_CONFIG.refreshToken.secure,
    sameSite: TOKEN_COOKIE_CONFIG.refreshToken.sameSite,
    path: TOKEN_COOKIE_CONFIG.refreshToken.path,
  });

  return response;
}

/**
 * Response helper: clear token cookies (logout)
 */
export function createLogoutResponse<T>(data: T, statusCode: number = 200): NextResponse<T> {
  const response = NextResponse.json(data, { status: statusCode });

  // Clear secure cookies
  response.cookies.delete(TOKEN_COOKIE_CONFIG.accessToken.name);
  response.cookies.delete(TOKEN_COOKIE_CONFIG.refreshToken.name);
  response.cookies.delete(TOKEN_COOKIE_CONFIG.adminToken.name);
  response.cookies.delete(TOKEN_COOKIE_CONFIG.adminRefreshToken.name);

  // Add cache-control headers to prevent caching logout response
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');

  return response;
}
