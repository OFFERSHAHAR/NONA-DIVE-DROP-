import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// ============================================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================================================

export interface AdminContext {
  userId: string;
  email: string;
  isAdmin: boolean;
  ip?: string;
  userAgent?: string;
}

/**
 * Verifies admin authorization for API routes
 * - Checks authentication status
 * - Verifies admin role (will need custom role field in users table)
 * - Returns context for audit logging
 */
export async function withAdminAuth(
  request: NextRequest
): Promise<{ data: AdminContext; error: NextResponse | null }> {
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
          { error: 'Unauthorized: Missing or invalid authentication' },
          { status: 401 }
        ),
      };
    }

    // TODO: Query custom admin role from users table after schema update
    // For now, assume all authenticated users can access admin panel
    // In production, check role field: role === 'admin'
    const isAdmin = true;

    if (!isAdmin) {
      return {
        data: null as any,
        error: NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        ),
      };
    }

    const context: AdminContext = {
      userId: user.id,
      email: user.email || '',
      isAdmin: true,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent') || undefined,
    };

    return { data: context, error: null };
  } catch (error) {
    console.error('Admin auth middleware error:', error);
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
// RATE LIMITING MIDDLEWARE (In-memory store)
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(maxRequests: number = 100, windowSeconds: number = 60) {
  return (key: string): { allowed: boolean; remaining: number } => {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowSeconds * 1000 });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
  };
}

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
