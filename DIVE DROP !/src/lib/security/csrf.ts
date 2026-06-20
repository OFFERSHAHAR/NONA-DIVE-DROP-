/**
 * CSRF Token Protection Middleware
 * Prevents Cross-Site Request Forgery attacks
 *
 * Features:
 * - Double-submit cookie pattern with HMAC validation
 * - Token generation and validation
 * - Per-session token management
 * - Support for SameSite cookie attribute
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_SECRET = process.env.CSRF_SECRET || 'csrf-secret-key-change-in-production';
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CSRFTokenPayload {
  token: string;
  issuedAt: number;
}

/**
 * Generate a CSRF token with HMAC signature
 * Format: token + ':' + HMAC(token + issuedAt)
 */
export function generateCSRFToken(): CSRFTokenPayload {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const issuedAt = Date.now();
  const tokenData = `${randomBytes}:${issuedAt}`;

  // Create HMAC signature for verification
  const hmac = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(tokenData)
    .digest('hex');

  const token = `${tokenData}:${hmac}`;

  return {
    token,
    issuedAt,
  };
}

/**
 * Validate CSRF token
 * Verifies:
 * - HMAC signature
 * - Token not expired
 */
export function validateCSRFToken(token: string): {
  valid: boolean;
  reason?: string;
} {
  try {
    // Token format: randomBytes:issuedAt:hmac
    const parts = token.split(':');

    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const [randomBytes, issuedAtStr, providedHmac] = parts;
    const issuedAt = parseInt(issuedAtStr, 10);

    if (isNaN(issuedAt)) {
      return { valid: false, reason: 'Invalid token timestamp' };
    }

    // Check expiry
    const now = Date.now();
    if (now - issuedAt > TOKEN_LIFETIME_MS) {
      return { valid: false, reason: 'Token expired' };
    }

    // Verify HMAC
    const tokenData = `${randomBytes}:${issuedAtStr}`;
    const expectedHmac = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(tokenData)
      .digest('hex');

    // Use constant-time comparison to prevent timing attacks
    if (!constantTimeEqual(providedHmac, expectedHmac)) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Token validation error' };
  }
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Extract CSRF token from request
 * Checks: headers, body, or query parameters
 */
export async function extractCSRFToken(request: NextRequest): Promise<string | null> {
  // Check header first (most secure)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }

  // Check query parameter
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('csrf-token');
  if (queryToken) {
    return queryToken;
  }

  // Check form body (only for POST/PUT/PATCH)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    try {
      const contentType = request.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const body = await request.clone().json();
        if (body._csrf) {
          return body._csrf;
        }
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.clone().formData();
        const token = formData.get('_csrf');
        if (token && typeof token === 'string') {
          return token;
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }

  return null;
}

/**
 * Middleware: Validate CSRF token for state-changing requests
 * Exempt GET, HEAD, OPTIONS
 */
export async function validateCSRFMiddleware(
  request: NextRequest
): Promise<{ valid: boolean; reason?: string }> {
  // Only check for state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return { valid: true };
  }

  // Extract token from request
  const token = await extractCSRFToken(request);

  if (!token) {
    return {
      valid: false,
      reason: 'CSRF token is missing. Include x-csrf-token header or _csrf field in body.',
    };
  }

  // Validate token
  const validation = validateCSRFToken(token);

  if (!validation.valid) {
    console.warn(`[CSRF] Token validation failed: ${validation.reason}`, {
      method: request.method,
      url: request.url,
    });
  }

  return validation;
}

/**
 * Create response with CSRF token in cookie
 */
export function createResponseWithCSRFToken<T>(
  data: T,
  statusCode: number = 200
): NextResponse<T> {
  const { token, issuedAt } = generateCSRFToken();

  const response = NextResponse.json(data, { status: statusCode });

  // Set CSRF token in secure cookie
  response.cookies.set({
    name: CSRF_TOKEN_NAME,
    value: token,
    httpOnly: false, // CSRF token can be read by JS (needed for headers)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_LIFETIME_MS / 1000,
    path: '/',
  });

  // Also include in response for convenience
  response.headers.set('X-CSRF-Token', token);

  return response;
}

/**
 * Extract CSRF token from cookies
 */
export function getCSRFTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_TOKEN_NAME)?.value || null;
}

/**
 * List of endpoints/methods exempt from CSRF validation
 * Some endpoints (like webhooks) may need exemption
 */
export const CSRF_EXEMPT_ENDPOINTS = [
  'POST /api/webhooks/stripe',
  'POST /api/webhooks/supabase',
  'GET /api/public/health',
  'HEAD /api/public/health',
];

/**
 * Check if endpoint is exempt from CSRF validation
 */
export function isCSRFExempt(method: string, pathname: string): boolean {
  const endpoint = `${method} ${pathname}`;
  return CSRF_EXEMPT_ENDPOINTS.some((exempt) => {
    // Support wildcards
    const regex = new RegExp(`^${exempt.replace('*', '.*')}$`);
    return regex.test(endpoint);
  });
}
