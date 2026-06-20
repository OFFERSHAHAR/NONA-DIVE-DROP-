/**
 * Auth Middleware Factory
 * Provides reusable authentication context extraction and validation
 * Supports both Next.js App Router request handlers and server components
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Base authentication context
 */
export interface AuthContext {
  userId: string;
  email: string | null;
  role?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Configuration options for auth middleware
 */
export interface AuthMiddlewareOptions {
  requireAdmin?: boolean;
  requireRole?: string[];
  extractIp?: boolean;
  extractUserAgent?: boolean;
}

/**
 * Result wrapper for auth middleware
 */
export interface AuthMiddlewareResult<T extends AuthContext = AuthContext> {
  data: T | null;
  error: NextResponse | null;
}

/**
 * Factory function to create typed auth middleware
 * Extracts authentication context from Supabase session
 *
 * Usage:
 * ```typescript
 * const { data: context, error } = await createAuthMiddleware(request);
 * if (error) return error;
 * // Use context.userId, context.email, etc.
 * ```
 */
export async function createAuthMiddleware<T extends AuthContext = AuthContext>(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<AuthMiddlewareResult<T>> {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {
            // No-op for auth middleware
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: NextResponse.json(
          {
            status: 'error',
            error: 'Unauthorized',
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        ),
      };
    }

    // Build context with user data
    const context: Partial<T> = {
      userId: user.id,
      email: user.email || null,
    } as Partial<T>;

    // Optionally extract request metadata
    if (options.extractIp) {
      context.ip =
        (request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip')) ??
        'unknown';
    }

    if (options.extractUserAgent) {
      context.userAgent = request.headers.get('user-agent') ?? undefined;
    }

    // Validate role if required
    if (options.requireRole) {
      const userRole = context.role;
      if (!userRole || !options.requireRole.includes(userRole)) {
        return {
          data: null,
          error: NextResponse.json(
            {
              status: 'error',
              error: 'Forbidden',
              timestamp: new Date().toISOString(),
            },
            { status: 403 }
          ),
        };
      }
    }

    return {
      data: context as T,
      error: null,
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      data: null,
      error: NextResponse.json(
        {
          status: 'error',
          error: 'Authentication failed',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Get authenticated user context for server components
 * Throws error if user is not authenticated
 */
export async function requireAuth(): Promise<AuthContext> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          // No-op for server components
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User is not authenticated');
  }

  return {
    userId: user.id,
    email: user.email || null,
  };
}

/**
 * Verify user owns a resource
 */
export function requireOwnership(userId: string | undefined, ownerId: string): void {
  if (userId !== ownerId) {
    throw new Error('User does not own this resource');
  }
}

/**
 * Check if user can perform an action
 */
export function requirePermission(
  userRole: string | undefined,
  requiredRole: string | string[]
): void {
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!userRole || !requiredRoles.includes(userRole)) {
    throw new Error('User does not have permission to perform this action');
  }
}

/**
 * Custom error class for authentication errors
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom error class for authorization errors
 */
export class AuthorizationError extends Error {
  constructor(message: string = 'Authorization failed') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
