/**
 * Unified Authorization Utilities for API Routes
 *
 * Single source of truth for all authentication & authorization checks.
 * Use these functions in place of scattered middleware implementations.
 *
 * Priority:
 * 1. Use requireAuth() for all protected routes
 * 2. Use requireAdminRole() for admin routes
 * 3. Use requireAdminPermission() for permission-level checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission, rolePermissionMap } from '@/lib/auth/admin-schemas';

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AdminUser extends AuthUser {
  role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
  is_active: boolean;
  status: 'active' | 'suspended' | 'pending';
}

/**
 * Require basic authentication for a route
 * Returns user object or error response
 */
export async function requireAuth(request: NextRequest): Promise<{ user: AuthUser | null; error: NextResponse | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        ),
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      error: null,
    };
  } catch (err) {
    console.error('[AUTH] Authentication error:', err);
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Internal authentication error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require specific admin role (admin or super_admin)
 */
export async function requireAdminRole(request: NextRequest): Promise<{ admin: AdminUser | null; error: NextResponse | null }> {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return { admin: null, error: authError };

  try {
    const supabase = await createClient();
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('role, is_active, status')
      .eq('user_id', user!.id)
      .single();

    const isValidAdmin =
      !dbError &&
      adminUser &&
      adminUser.is_active === true &&
      adminUser.status === 'active' &&
      (adminUser.role === 'admin' || adminUser.role === 'super_admin');

    if (!isValidAdmin) {
      return {
        admin: null,
        error: NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        ),
      };
    }

    return {
      admin: {
        id: user!.id,
        email: user!.email,
        role: adminUser!.role,
        is_active: adminUser!.is_active,
        status: adminUser!.status,
      },
      error: null,
    };
  } catch (err) {
    console.error('[AUTH] Admin role check error:', err);
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Internal authorization error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin(request: NextRequest): Promise<{ admin: AdminUser | null; error: NextResponse | null }> {
  const { admin, error: adminError } = await requireAdminRole(request);
  if (adminError) return { admin: null, error: adminError };

  if (admin!.role !== 'super_admin') {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      ),
    };
  }

  return { admin, error: null };
}

/**
 * Require moderator role or above
 */
export async function requireModeratorRole(request: NextRequest): Promise<{ admin: AdminUser | null; error: NextResponse | null }> {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return { admin: null, error: authError };

  try {
    const supabase = await createClient();
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('role, is_active, status')
      .eq('user_id', user!.id)
      .single();

    const isValidModerator =
      !dbError &&
      adminUser &&
      adminUser.is_active === true &&
      adminUser.status === 'active' &&
      ['moderator', 'admin', 'super_admin'].includes(adminUser?.role || '');

    if (!isValidModerator) {
      return {
        admin: null,
        error: NextResponse.json(
          { error: 'Forbidden: Moderator access required' },
          { status: 403 }
        ),
      };
    }

    return {
      admin: {
        id: user!.id,
        email: user!.email,
        role: adminUser!.role as any,
        is_active: adminUser!.is_active,
        status: adminUser!.status,
      },
      error: null,
    };
  } catch (err) {
    console.error('[AUTH] Moderator role check error:', err);
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Internal authorization error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require specific permission
 */
export async function requireAdminPermission(
  request: NextRequest,
  requiredPermission: AdminPermission | AdminPermission[]
): Promise<{ admin: AdminUser | null; error: NextResponse | null }> {
  const { admin, error: adminError } = await requireAdminRole(request);
  if (adminError) return { admin: null, error: adminError };

  try {
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const rolePermissions = rolePermissionMap[admin!.role as keyof typeof rolePermissionMap] || [];

    const hasAllPermissions = permissions.every((perm) => rolePermissions.includes(perm));

    if (!hasAllPermissions) {
      return {
        admin: null,
        error: NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        ),
      };
    }

    return { admin, error: null };
  } catch (err) {
    console.error('[AUTH] Permission check error:', err);
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Internal authorization error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Verify CRON request (for scheduled tasks)
 * Must include valid CRON_SECRET header
 */
export function verifyCronRequest(request: NextRequest): { valid: boolean; error: NextResponse | null } {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('[CRON] CRON_SECRET not configured in environment');
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      ),
    };
  }

  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Invalid CRON secret' },
        { status: 401 }
      ),
    };
  }

  return { valid: true, error: null };
}

/**
 * Verify owner (user owns the resource)
 * Use after requireAuth()
 */
export function verifyOwnership(userId: string, ownerId: string): { valid: boolean; error: NextResponse | null } {
  if (userId !== ownerId) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Forbidden: You do not own this resource' },
        { status: 403 }
      ),
    };
  }

  return { valid: true, error: null };
}

/**
 * Check if user is owner OR admin
 */
export async function verifyOwnershipOrAdmin(
  userId: string,
  resourceOwnerId: string
): Promise<{ valid: boolean; error: NextResponse | null }> {
  // User owns resource
  if (userId === resourceOwnerId) {
    return { valid: true, error: null };
  }

  // Check if user is admin
  try {
    const supabase = await createClient();
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('role, is_active, status')
      .eq('user_id', userId)
      .single();

    const isAdmin =
      !dbError &&
      adminUser &&
      adminUser.is_active === true &&
      adminUser.status === 'active' &&
      ['admin', 'super_admin'].includes(adminUser?.role || '');

    if (isAdmin) {
      return { valid: true, error: null };
    }

    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Forbidden: You do not own this resource and are not an admin' },
        { status: 403 }
      ),
    };
  } catch (err) {
    console.error('[AUTH] Ownership check error:', err);
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Internal authorization error' },
        { status: 500 }
      ),
    };
  }
}
