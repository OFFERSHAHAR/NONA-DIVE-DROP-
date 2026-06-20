import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export type AuditAction =
  | 'admin_login'
  | 'admin_logout'
  | 'admin_failed_login'
  | 'create_user'
  | 'edit_user'
  | 'delete_user'
  | 'ban_user'
  | 'unban_user'
  | 'create_dive_site'
  | 'edit_dive_site'
  | 'delete_dive_site'
  | 'publish_dive_site'
  | 'archive_dive_site'
  | 'create_shuttle'
  | 'edit_shuttle'
  | 'delete_shuttle'
  | 'set_shuttle_schedule'
  | 'invite_admin'
  | 'accept_invitation'
  | 'change_admin_role'
  | 'deactivate_admin'
  | 'activate_admin'
  | 'enable_2fa'
  | 'disable_2fa'
  | 'change_password'
  | 'reset_password'
  | 'update_profile'
  | 'unauthorized_access_attempt'
  | 'suspicious_activity'
  | 'bulk_operation'
  | 'system_change';

export type AuditResourceType = 'users' | 'dive_sites' | 'shuttles' | 'admin_users' | 'auth' | 'system' | 'unknown';

export type AuditStatus = 'success' | 'failure';

export async function logAdminAction(
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId?: string | null,
  oldValues?: object | null,
  newValues?: object | null,
  status: AuditStatus = 'success',
  errorMessage?: string | null
) {
  try {
    const supabase = (await createClient()) as any;
    const headerList = await headers();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Cannot log admin action: user not authenticated');
      return;
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminUser) {
      console.warn('Cannot log admin action: user is not an admin');
      return;
    }

    const ip = headerList.get('x-forwarded-for') || headerList.get('x-client-ip') || 'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';

    const { error } = await supabase.from('admin_audit_logs').insert({
      admin_user_id: adminUser.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: ip,
      user_agent: userAgent,
      status,
      error_message: errorMessage || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Audit log insertion error:', error);
    }
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

export async function logLoginAttempt(email: string, success: boolean, reason?: string) {
  try {
    const supabase = (await createClient()) as any;
    const headerList = await headers();

    const ip = headerList.get('x-forwarded-for') || headerList.get('x-client-ip') || 'unknown';

    await supabase.from('admin_login_attempts').insert({
      email,
      ip_address: ip,
      success,
      reason: reason || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}

export async function checkLoginRateLimit(ip: string, timeWindowMinutes: number = 15, maxAttempts: number = 5): Promise<boolean> {
  try {
    const supabase = (await createClient()) as any;

    const { data: attempts, error } = await supabase
      .from('admin_login_attempts')
      .select('*')
      .eq('ip_address', ip)
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString());

    if (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }

    return (attempts?.length || 0) >= maxAttempts;
  } catch (error) {
    console.error('Error in rate limit check:', error);
    return false;
  }
}

export function createAuditDiff(oldValues?: Record<string, any>, newValues?: Record<string, any>) {
  const sensitiveFields = ['password', 'totp_secret', 'backup_codes', 'auth_token'];

  const sanitize = (obj: Record<string, any> | undefined) => {
    if (!obj) return null;
    const sanitized = { ...obj };
    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });
    return sanitized;
  };

  return {
    old_values: sanitize(oldValues),
    new_values: sanitize(newValues),
  };
}

type AuditMetadata = { ip?: string; userAgent?: string };

const resourceActions = {
  users: { create: 'create_user', update: 'edit_user', delete: 'delete_user' },
  dive_sites: { create: 'create_dive_site', update: 'edit_dive_site', delete: 'delete_dive_site' },
  shuttles: { create: 'create_shuttle', update: 'edit_shuttle', delete: 'delete_shuttle' },
} as const;

type ManagedResource = keyof typeof resourceActions;

export async function logCreate(resource: ManagedResource, resourceId: string, actorId: string, values: object, metadata?: AuditMetadata) {
  return logAdminAction(resourceActions[resource].create, resource, resourceId, null, { ...values, actorId, metadata });
}

export async function logUpdate(resource: ManagedResource, resourceId: string, actorId: string, values: object, metadata?: AuditMetadata) {
  return logAdminAction(resourceActions[resource].update, resource, resourceId, null, { ...values, actorId, metadata });
}

export async function logDelete(resource: ManagedResource, resourceId: string, actorId: string, metadata?: AuditMetadata) {
  return logAdminAction(resourceActions[resource].delete, resource, resourceId, null, { actorId, metadata });
}

export async function logImport(resource: ManagedResource, actorId: string, values: object, metadata?: AuditMetadata) {
  return logAdminAction('bulk_operation', resource, null, null, { ...values, actorId, metadata });
}
