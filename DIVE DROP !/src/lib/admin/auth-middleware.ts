import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from './jwt-service';

export interface AdminContext {
  username: string;
  role: 'super_admin';
  ip?: string;
  userAgent?: string;
}

/**
 * Verifies admin JWT token from cookies and returns admin context
 * Use this in API routes that require admin authentication
 */
export async function withAdminAuth(
  request: NextRequest
): Promise<{ data: AdminContext | null; error: NextResponse | null }> {
  try {
    // Get token from cookies
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return {
        data: null,
        error: NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: Missing authentication token',
          },
          { status: 401 }
        ),
      };
    }

    // Verify token
    const payload = await verifyAdminToken(token);

    if (!payload) {
      return {
        data: null,
        error: NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: Invalid or expired token',
          },
          { status: 401 }
        ),
      };
    }

    const context: AdminContext = {
      username: payload.username,
      role: payload.role,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    return { data: context, error: null };
  } catch (error) {
    console.error('[ADMIN AUTH] Middleware error:', error);
    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Middleware function for protecting admin API routes
 * Returns 401 if not authenticated, 403 if not admin role
 */
export async function requireAdminAuth(request: NextRequest) {
  const { data, error } = await withAdminAuth(request);

  if (error) {
    return error;
  }

  // Check role
  if (data?.role !== 'super_admin') {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden: Super admin access required',
      },
      { status: 403 }
    );
  }

  return null; // No error, proceed
}
