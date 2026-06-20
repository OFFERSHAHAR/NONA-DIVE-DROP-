import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface BookingContext {
  userId: string;
  userEmail: string;
  ip: string;
  userAgent: string;
}

/**
 * Middleware to validate booking authentication
 */
export async function withBookingAuth(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        data: null,
        error: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return {
      data: {
        userId: user.id,
        userEmail: user.email || '',
        ip,
        userAgent,
      } as BookingContext,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      ),
    };
  }
}

/**
 * Check if user is a service provider
 */
export async function withProviderAuth(request: NextRequest) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return { data: null, error: authError };

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: user, error } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('id', context!.userId)
      .single();

    if (error || !user || user.user_type !== 'service_provider') {
      return {
        data: null,
        error: NextResponse.json(
          { error: 'Only service providers can access this resource' },
          { status: 403 }
        ),
      };
    }

    return { data: context, error: null };
  } catch (error) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Provider validation failed' },
        { status: 403 }
      ),
    };
  }
}

/**
 * Standard response helpers
 */
export function successResponse<T>(data: T) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(message: string, code?: string) {
  return {
    success: false,
    error: {
      message,
      code: code || 'UNKNOWN_ERROR',
    },
    timestamp: new Date().toISOString(),
  };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Rate limiting
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const rateLimitConfigs = {
  bookings: { maxRequests: 30, windowMs: 60000 } as RateLimitConfig,
  payment: { maxRequests: 10, windowMs: 60000 } as RateLimitConfig,
  confirmation: { maxRequests: 20, windowMs: 60000 } as RateLimitConfig,
};

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(config: RateLimitConfig) {
  return (key: string) => {
    const now = Date.now();
    const data = rateLimitStore.get(key);

    if (!data || now > data.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      return { allowed: true, retryAfter: null };
    }

    if (data.count >= config.maxRequests) {
      return {
        allowed: false,
        retryAfter: Math.ceil((data.resetTime - now) / 1000),
      };
    }

    data.count++;
    return { allowed: true, retryAfter: null };
  };
}

export function rateLimitErrorResponse(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      },
    },
    { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
  );
}
