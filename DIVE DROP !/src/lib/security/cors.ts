/**
 * CORS & Origin Validation Module
 * Implements CORS middleware with origin whitelist
 *
 * Features:
 * - Origin validation
 * - Credential handling
 * - Preflight request handling
 * - Configurable per-environment origins
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Allowed origins configuration
 * In production, load from environment variables
 */
const ALLOWED_ORIGINS = {
  development: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
  ],
  production: [
    'https://dive-drop.com',
    'https://www.dive-drop.com',
    'https://admin.dive-drop.com',
  ],
  staging: [
    'https://staging.dive-drop.com',
    'https://staging-admin.dive-drop.com',
  ],
};

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): string[] {
  const env = process.env.NODE_ENV || 'development';

  let origins: string[] = [];

  if (env === 'production' && process.env.ALLOWED_ORIGINS) {
    // Production: use environment variable
    origins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  } else if (env === 'production') {
    origins = ALLOWED_ORIGINS.production;
  } else if (env === 'staging') {
    origins = ALLOWED_ORIGINS.staging;
  } else {
    origins = ALLOWED_ORIGINS.development;
  }

  return origins;
}

/**
 * Validate origin against whitelist
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.some(allowed => {
    // Exact match
    if (allowed === origin) return true;

    // Wildcard subdomain (only in development)
    if (process.env.NODE_ENV !== 'production' && allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }

    return false;
  });
}

/**
 * CORS headers for allowed origin
 */
export function getCORSHeaders(origin: string, credentials: boolean = true): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': credentials ? 'true' : 'false',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
    'Access-Control-Max-Age': '3600', // 1 hour preflight cache
    'Access-Control-Expose-Headers': 'X-Total-Count, X-Page-Count, Content-Range',
  };
}

/**
 * CORS middleware for API routes
 * Use in route handlers to validate origin and set CORS headers
 */
export async function withCORS(
  request: NextRequest,
  allowCredentials: boolean = true
): Promise<{ allowed: boolean; headers: Record<string, string>; response?: NextResponse }> {
  const origin = request.headers.get('origin');
  const method = request.method;

  // Preflight request
  if (method === 'OPTIONS') {
    if (!origin || !isOriginAllowed(origin)) {
      return {
        allowed: false,
        headers: {},
        response: new NextResponse('Forbidden', { status: 403 }),
      };
    }

    const headers = getCORSHeaders(origin, allowCredentials);
    return {
      allowed: true,
      headers,
      response: new NextResponse(null, {
        status: 204,
        headers,
      }),
    };
  }

  // Regular request
  if (!origin) {
    // No origin header - allow (same-origin request)
    return {
      allowed: true,
      headers: {},
    };
  }

  if (!isOriginAllowed(origin)) {
    console.warn(`[CORS] Request from disallowed origin: ${origin}`);
    return {
      allowed: false,
      headers: {},
      response: new NextResponse('Forbidden', { status: 403 }),
    };
  }

  return {
    allowed: true,
    headers: getCORSHeaders(origin, allowCredentials),
  };
}

/**
 * API Route handler wrapper with CORS
 * Usage:
 * export const GET = withCORSHandler(async (request) => {
 *   // handler code
 * });
 */
export function withCORSHandler(
  handler: (
    request: NextRequest,
    context?: any
  ) => Promise<NextResponse | Response>,
  allowCredentials: boolean = true
) {
  return async (request: NextRequest, context?: any) => {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      const corsCheck = await withCORS(request, allowCredentials);
      if (corsCheck.response) {
        return corsCheck.response;
      }
    }

    // Check origin
    const corsCheck = await withCORS(request, allowCredentials);

    if (!corsCheck.allowed) {
      return new NextResponse('CORS validation failed', { status: 403 });
    }

    // Call handler
    const response = await handler(request, context);

    // Add CORS headers to response
    if (corsCheck.headers && Object.keys(corsCheck.headers).length > 0) {
      Object.entries(corsCheck.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    return response;
  };
}

/**
 * Simple origin check for server actions and middleware
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');

  if (!origin) {
    // No origin header - likely same-origin
    return true;
  }

  return isOriginAllowed(origin);
}

/**
 * Get origin from request
 */
export function getOrigin(request: NextRequest): string | null {
  return request.headers.get('origin') || request.headers.get('referer');
}
