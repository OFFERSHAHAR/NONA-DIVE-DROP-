import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// ============================================================================
// BUDDY AUTH MIDDLEWARE
// ============================================================================

export interface BuddyAuthContext {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Verifies user is authenticated for buddy feature access
 * Unlike admin routes, any authenticated user can access buddy features
 */
export async function withBuddyAuth(
  request: NextRequest
): Promise<{ data: BuddyAuthContext; error: NextResponse | null }> {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null as any,
        error: NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        ),
      };
    }

    // Get user profile from database for additional info
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        data: null as any,
        error: NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        ),
      };
    }

    const context: BuddyAuthContext = {
      userId: user.id,
      email: user.email || '',
      firstName: profile.first_name,
      lastName: profile.last_name,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    return { data: context, error: null };
  } catch (error) {
    console.error('Buddy auth middleware error:', error);
    return {
      data: null as any,
      error: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

// ============================================================================
// OWNERSHIP VERIFICATION MIDDLEWARE
// ============================================================================

/**
 * Verifies user owns/created the resource
 */
export async function verifyListingOwnership(
  listingId: string,
  userId: string,
  supabase: any
): Promise<{ isOwner: boolean; error: NextResponse | null }> {
  try {
    const { data: listing, error } = await supabase
      .from('buddy_listings')
      .select('user_id')
      .eq('id', listingId)
      .single();

    if (error || !listing) {
      return {
        isOwner: false,
        error: NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        ),
      };
    }

    const isOwner = listing.user_id === userId;

    if (!isOwner) {
      return {
        isOwner: false,
        error: NextResponse.json(
          { error: 'Forbidden: You do not own this listing' },
          { status: 403 }
        ),
      };
    }

    return { isOwner: true, error: null };
  } catch (error) {
    console.error('Ownership verification error:', error);
    return {
      isOwner: false,
      error: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export function withRateLimit(config: RateLimitConfig) {
  return (key: string): { allowed: boolean; remaining: number; retryAfter?: number } => {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowSeconds * 1000
      });
      return { allowed: true, remaining: config.maxRequests - 1 };
    }

    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter
      };
    }

    entry.count++;
    return { allowed: true, remaining: config.maxRequests - entry.count };
  };
}

// Predefined rate limit configs
export const rateLimitConfigs = {
  listings: { maxRequests: 50, windowSeconds: 60 },           // 50 per minute
  interests: { maxRequests: 20, windowSeconds: 60 },          // 20 per minute
  messages: { maxRequests: 100, windowSeconds: 60 },          // 100 per minute
  reports: { maxRequests: 5, windowSeconds: 3600 },           // 5 per hour
  contactReveal: { maxRequests: 30, windowSeconds: 60 },      // 30 per minute
};

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(data: T, pagination?: any): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    pagination,
  };
}

export function errorResponse(error: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function rateLimitErrorResponse(retryAfter: number): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      timestamp: new Date().toISOString(),
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}
