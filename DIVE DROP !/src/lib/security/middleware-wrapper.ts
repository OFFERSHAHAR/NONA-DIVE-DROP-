/**
 * Middleware Wrapper for Security Checks
 * Applies CSRF validation and rate limiting to all state-changing requests
 *
 * Usage in route handlers:
 * ```
 * import { withSecurityMiddleware } from '@/lib/security/middleware-wrapper';
 *
 * export const POST = withSecurityMiddleware(async (request) => {
 *   // Your handler logic
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCSRFMiddleware, isCSRFExempt } from './csrf';
import { checkRateLimit, recordFailedAttempt, RATE_LIMIT_CONFIGS } from './rate-limiter';

export interface SecurityMiddlewareOptions {
  requireCSRF?: boolean;
  rateLimit?: boolean;
  rateLimitConfig?: {
    maxAttempts: number;
    windowMs: number;
    lockoutMs: number;
  };
  exemptPatterns?: string[]; // Endpoints exempt from security checks
}

/**
 * Get client IP address for rate limiting
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown'
  );
}

/**
 * Check if request path matches any exempt pattern
 */
function isPathExempt(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Support wildcards
    const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
    return regex.test(pathname);
  });
}

/**
 * Higher-order function to wrap API handlers with security middleware
 */
export function withSecurityMiddleware<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  options: SecurityMiddlewareOptions = {}
): T {
  const {
    requireCSRF = true,
    rateLimit = true,
    rateLimitConfig = RATE_LIMIT_CONFIGS.apiEndpoint,
    exemptPatterns = [],
  } = options;

  return (async (request: NextRequest) => {
    const pathname = new URL(request.url).pathname;
    const method = request.method;

    // Check if endpoint is exempt
    if (isPathExempt(pathname, exemptPatterns)) {
      return handler(request);
    }

    // CSRF validation for state-changing requests
    if (requireCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (!isCSRFExempt(method, pathname)) {
        const csrfValidation = await validateCSRFMiddleware(request);
        if (!csrfValidation.valid) {
          console.warn(`[SECURITY] CSRF validation failed: ${csrfValidation.reason}`, {
            method,
            pathname,
            ip: getClientIP(request),
          });

          return NextResponse.json(
            {
              error: csrfValidation.reason || 'CSRF token validation failed',
            },
            { status: 403 }
          );
        }
      }
    }

    // Rate limiting
    if (rateLimit) {
      const clientIP = getClientIP(request);
      const rateLimitKey = `${method}:${pathname}:${clientIP}`;

      const rateLimitStatus = checkRateLimit(rateLimitKey, rateLimitConfig);

      if (rateLimitStatus.isLimited) {
        console.warn(`[RATE LIMIT] Exceeded for ${rateLimitKey}`, {
          remaining: rateLimitStatus.remainingTime,
        });

        return NextResponse.json(
          {
            error: 'Too many requests. Please try again later.',
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimitStatus.remainingTime || 0) / 1000).toString(),
            },
          }
        );
      }
    }

    // Call the actual handler
    return handler(request);
  }) as T;
}

/**
 * Middleware for routes that require authentication
 */
export async function withAuthMiddleware(
  request: NextRequest,
  requiredRole?: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return { valid: false, error: 'Missing authentication token' };
  }

  try {
    // Verify token here (integrate with your JWT service)
    // This is a placeholder - implement based on your token structure
    return { valid: true, userId: 'user-id' };
  } catch (error) {
    return { valid: false, error: 'Invalid authentication token' };
  }
}

/**
 * Create a secure API response
 */
export function createSecureResponse<T>(
  data: T,
  statusCode: number = 200,
  headers?: Record<string, string>
): NextResponse<T> {
  const response = NextResponse.json(data, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff', // Prevent MIME sniffing
      'X-Frame-Options': 'DENY', // Prevent clickjacking
      'X-XSS-Protection': '1; mode=block', // XSS protection
      ...headers,
    },
  });

  // Add security headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');

  return response;
}

/**
 * Create a secure error response
 */
export function createSecureErrorResponse(
  error: string,
  statusCode: number = 400,
  details?: Record<string, any>
): NextResponse {
  return createSecureResponse(
    {
      error,
      ...(process.env.NODE_ENV === 'development' && details && { details }),
    },
    statusCode
  );
}
