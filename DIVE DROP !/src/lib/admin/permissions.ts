import { createClient } from '@/lib/supabase/server';
import { AdminPermission, rolePermissionMap } from '@/lib/auth/admin-schemas';

/**
 * Check if the current user has a specific permission
 * @param requiredPermission - The permission to check
 * @returns true if user has permission, false otherwise
 */
export async function checkAdminPermission(requiredPermission: AdminPermission | string): Promise<boolean> {
  try {
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('role, permissions, is_active, status')
      .eq('user_id', user.id)
      .single();

    if (error || !adminUser || !adminUser.is_active || adminUser.status !== 'active') {
      return false;
    }

    // Check role-based permissions
    const rolePermissions = rolePermissionMap[adminUser.role as keyof typeof rolePermissionMap] || [];
    if (rolePermissions.includes(requiredPermission as AdminPermission)) {
      return true;
    }

    // Check custom permissions (for future extensibility)
    if (adminUser.permissions && Array.isArray(adminUser.permissions)) {
      return adminUser.permissions.includes(requiredPermission);
    }

    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Check if current user has ALL of the required permissions
 */
export async function checkAdminPermissions(permissions: (AdminPermission | string)[]): Promise<boolean> {
  const results = await Promise.all(permissions.map((p) => checkAdminPermission(p)));
  return results.every((result) => result === true);
}

/**
 * Check if current user has ANY of the required permissions
 */
export async function checkAdminPermissionsAny(permissions: (AdminPermission | string)[]): Promise<boolean> {
  const results = await Promise.all(permissions.map((p) => checkAdminPermission(p)));
  return results.some((result) => result === true);
}

/**
 * Get all permissions for the current user
 */
export async function getAdminPermissions(): Promise<AdminPermission[]> {
  try {
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single();

    if (error || !adminUser) return [];

    const basePermissions = rolePermissionMap[adminUser.role as keyof typeof rolePermissionMap] || [];
    const customPermissions = (adminUser.permissions || []) as AdminPermission[];

    return [...new Set([...basePermissions, ...customPermissions])];
  } catch (error) {
    console.error('Get permissions error:', error);
    return [];
  }
}

/**
 * Get admin user role and status
 */
export async function getAdminUserInfo() {
  try {
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, role, status, is_active, email, totp_enabled')
      .eq('user_id', user.id)
      .single();

    if (error || !adminUser) return null;

    return adminUser;
  } catch (error) {
    console.error('Get admin user info error:', error);
    return null;
  }
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const adminUser = await getAdminUserInfo();
    return adminUser?.role === 'super_admin' && adminUser?.is_active === true && adminUser?.status === 'active';
  } catch {
    return false;
  }
}

/**
 * Check if user is admin or above
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const adminUser = await getAdminUserInfo();
    return (
      (adminUser?.role === 'admin' || adminUser?.role === 'super_admin') &&
      adminUser?.is_active === true &&
      adminUser?.status === 'active'
    );
  } catch {
    return false;
  }
}

/**
 * Check if user is moderator or above
 */
export async function isModerator(): Promise<boolean> {
  try {
    const adminUser = await getAdminUserInfo();
    return (
      ['admin', 'moderator', 'super_admin'].includes(adminUser?.role || '') &&
      adminUser?.is_active === true &&
      adminUser?.status === 'active'
    );
  } catch {
    return false;
  }
}

/**
 * Helper to check multiple users for a permission
 */
export async function checkUsersAdminPermission(userId: string, permission: AdminPermission | string): Promise<boolean> {
  try {
    const supabase = (await createClient()) as any;

    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('role, permissions, is_active, status')
      .eq('user_id', userId)
      .single();

    if (error || !adminUser || !adminUser.is_active || adminUser.status !== 'active') {
      return false;
    }

    const rolePermissions = rolePermissionMap[adminUser.role as keyof typeof rolePermissionMap] || [];
    if (rolePermissions.includes(permission as AdminPermission)) {
      return true;
    }

    return adminUser.permissions?.includes(permission) || false;
  } catch (error) {
    console.error('User permission check error:', error);
    return false;
  }
}
