import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Response Helpers
 */
export function successResponse<T>(data: T, message: string = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(message: string, statusCode: number) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
    },
    { status: statusCode }
  );
}

/**
 * Pagination Response Helper
 */
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
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Rate Limiting Configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const trackingRateLimitConfigs = {
  locationUpdate: { maxRequests: 12, windowMs: 60000 } as RateLimitConfig, // 1 update per 5 seconds max
  tripManagement: { maxRequests: 10, windowMs: 60000 } as RateLimitConfig, // 10 per minute
  tracking: { maxRequests: 30, windowMs: 60000 } as RateLimitConfig, // 30 requests per minute
};

/**
 * Simple in-memory rate limiter
 * In production, use Redis
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(config: RateLimitConfig) {
  return (key: string): { allowed: boolean; retryAfter?: number } => {
    const now = Date.now();
    const bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      return { allowed: true };
    }

    if (bucket.count >= config.maxRequests) {
      const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    bucket.count++;
    return { allowed: true };
  };
}

export function rateLimitErrorResponse(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      message: `Too many requests. Please try again after ${retryAfter} seconds.`,
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString(),
      },
    }
  );
}

/**
 * Authentication context
 */
export interface AuthContext {
  userId: string;
  email: string;
  role: 'driver' | 'passenger' | 'admin';
  ip: string;
  userAgent: string;
}

/**
 * Driver Auth Middleware
 * Verifies request is from authenticated driver
 */
export async function withDriverAuth(
  request: NextRequest
): Promise<{ data: AuthContext | null; error: NextResponse | null }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        data: null,
        error: errorResponse('Missing or invalid authorization header', 401),
      };
    }

    const token = authHeader.substring(7);
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
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

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        data: null,
        error: errorResponse('Invalid or expired token', 401),
      };
    }

    // Get user profile to verify role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        data: null,
        error: errorResponse('User profile not found', 404),
      };
    }

    // Check if user is a driver
    const { data: driverData } = await supabase
      .from('shuttle_drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driverData) {
      return {
        data: null,
        error: errorResponse('User is not a registered driver', 403),
      };
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return {
      data: {
        userId: user.id,
        email: user.email || '',
        role: 'driver',
        ip,
        userAgent,
      },
      error: null,
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      data: null,
      error: errorResponse('Authentication failed', 500),
    };
  }
}

/**
 * Passenger/User Auth Middleware
 * Verifies request is from authenticated user
 */
export async function withUserAuth(
  request: NextRequest
): Promise<{ data: AuthContext | null; error: NextResponse | null }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        data: null,
        error: errorResponse('Missing or invalid authorization header', 401),
      };
    }

    const token = authHeader.substring(7);
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
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

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        data: null,
        error: errorResponse('Invalid or expired token', 401),
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        data: null,
        error: errorResponse('User profile not found', 404),
      };
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return {
      data: {
        userId: user.id,
        email: user.email || '',
        role: 'passenger',
        ip,
        userAgent,
      },
      error: null,
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      data: null,
      error: errorResponse('Authentication failed', 500),
    };
  }
}

/**
 * Check if user owns the trip (is the driver or passenger)
 */
export async function checkTripOwnership(
  tripId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
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

  const { data: trip } = await supabase
    .from('shuttle_trips')
    .select('driver_id, passenger_id')
    .eq('id', tripId)
    .single();

  if (!trip) return false;

  if (role === 'driver') {
    return trip.driver_id === userId;
  } else if (role === 'passenger') {
    return trip.passenger_id === userId;
  }

  return false;
}
