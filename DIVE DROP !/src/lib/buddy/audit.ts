import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// ============================================================================
// AUDIT LOGGING FOR BUDDY FEATURE
// ============================================================================

export type BuddyAuditAction =
  | 'LISTING_CREATE'
  | 'LISTING_UPDATE'
  | 'LISTING_DELETE'
  | 'INTEREST_CREATE'
  | 'INTEREST_ACCEPT'
  | 'INTEREST_REJECT'
  | 'INTEREST_CANCEL'
  | 'CONTACT_REVEAL'
  | 'MESSAGE_SEND'
  | 'CONNECTION_CREATE'
  | 'CONNECTION_DELETE'
  | 'USER_BLOCK'
  | 'USER_REPORT'
  | 'LISTING_EXPIRE';

interface AuditLogPayload {
  action: BuddyAuditAction;
  userId: string;
  resourceType: 'listing' | 'interest' | 'message' | 'connection' | 'block' | 'report';
  resourceId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

/**
 * Log buddy feature actions for security and compliance
 */
export async function logBuddyAction(payload: AuditLogPayload): Promise<void> {
  try {
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

    // Insert audit log - ensure buddy_audit_logs table exists
    const { error } = await supabase
      .from('buddy_audit_logs')
      .insert({
        action: payload.action,
        user_id: payload.userId,
        resource_type: payload.resourceType,
        resource_id: payload.resourceId,
        changes: payload.changes,
        metadata: payload.metadata,
        ip_address: payload.ip,
        user_agent: payload.userAgent,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Audit log error:', error);
      // Don't throw - logging failures shouldn't break the main operation
    }
  } catch (error) {
    console.error('Error logging buddy action:', error);
  }
}

/**
 * Log contact reveal - especially important for safety/audit
 */
export async function logContactReveal(
  userId: string,
  targetUserId: string,
  listingId: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logBuddyAction({
    action: 'CONTACT_REVEAL',
    userId,
    resourceType: 'listing',
    resourceId: listingId,
    metadata: {
      targetUserId,
      timestamp: new Date().toISOString(),
    },
    ip,
    userAgent,
  });
}

/**
 * Log safety report
 */
export async function logSafetyReport(
  userId: string,
  reportedUserId: string,
  reason: string,
  description: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logBuddyAction({
    action: 'USER_REPORT',
    userId,
    resourceType: 'report',
    resourceId: reportedUserId,
    metadata: {
      reason,
      description,
      timestamp: new Date().toISOString(),
    },
    ip,
    userAgent,
  });
}

/**
 * Log user block
 */
export async function logUserBlock(
  userId: string,
  blockedUserId: string,
  reason?: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logBuddyAction({
    action: 'USER_BLOCK',
    userId,
    resourceType: 'block',
    resourceId: blockedUserId,
    metadata: {
      reason,
      timestamp: new Date().toISOString(),
    },
    ip,
    userAgent,
  });
}

/**
 * Get audit logs for a user (admin only)
 */
export async function getAuditLogs(
  filters?: {
    userId?: string;
    action?: BuddyAuditAction;
    resourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
): Promise<any[]> {
  try {
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

    let query = supabase.from('buddy_audit_logs').select('*');

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 100);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}
