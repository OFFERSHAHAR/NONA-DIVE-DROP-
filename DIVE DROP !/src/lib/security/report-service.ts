/**
 * Report Service
 *
 * Allows users to report spam, abuse, or inappropriate content
 * Reports are tracked for moderation and legal compliance
 */

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from './auth-middleware';
import type { AuthContext } from './auth-middleware';

export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'other';
export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedListingId?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Report a user for spam/abuse
 */
export async function reportUser(
  context: AuthContext,
  reportedUserId: string,
  reason: ReportReason,
  description?: string
): Promise<Report> {
  const user = requireAuth(context);

  if (user.id === reportedUserId) {
    throw new Error('Cannot report yourself');
  }

  const supabase = await createClient();

  try {
    // Check if already reported recently
    const { data: recent } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('reported_user_id', reportedUserId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (recent) {
      throw new Error('You have already reported this user recently');
    }

    // Create report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
        description,
        status: 'open',
      })
      .select()
      .single();

    if (error || !report) {
      throw error || new Error('Failed to create report');
    }

    // Log to audit
    const auditSupabase = await createClient();
    await auditSupabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'user_reported',
      resource_type: 'user',
      resource_id: reportedUserId,
      target_user_id: reportedUserId,
      details: { reason, description },
    });

    return {
      id: report.id,
      reporterId: report.reporter_id,
      reportedUserId: report.reported_user_id,
      reason: report.reason as ReportReason,
      description: report.description,
      status: report.status as ReportStatus,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };
  } catch (error) {
    console.error('Report user failed:', error);
    throw error;
  }
}

/**
 * Report a listing for spam/abuse
 */
export async function reportListing(
  context: AuthContext,
  listingId: string,
  reason: ReportReason,
  description?: string
): Promise<Report> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    // Get listing owner
    const { data: listing } = await supabase
      .from('listings')
      .select('owner_id')
      .eq('id', listingId)
      .single();

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Check if already reported recently
    const { data: recent } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('reported_listing_id', listingId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (recent) {
      throw new Error('You have already reported this listing recently');
    }

    // Create report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: listing.owner_id,
        reported_listing_id: listingId,
        reason,
        description,
        status: 'open',
      })
      .select()
      .single();

    if (error || !report) {
      throw error || new Error('Failed to create report');
    }

    // Log to audit
    const auditSupabase = await createClient();
    await auditSupabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'user_reported',
      resource_type: 'listing',
      resource_id: listingId,
      target_user_id: listing.owner_id,
      details: { reason, description },
    });

    return {
      id: report.id,
      reporterId: report.reporter_id,
      reportedUserId: listing.owner_id,
      reportedListingId: report.reported_listing_id,
      reason: report.reason as ReportReason,
      description: report.description,
      status: report.status as ReportStatus,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };
  } catch (error) {
    console.error('Report listing failed:', error);
    throw error;
  }
}

/**
 * Get user's own reports
 */
export async function getUserReports(
  context: AuthContext
): Promise<Report[]> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (reports || []).map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reportedUserId: r.reported_user_id,
      reportedListingId: r.reported_listing_id,
      reason: r.reason as ReportReason,
      description: r.description,
      status: r.status as ReportStatus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (error) {
    console.error('Get reports failed:', error);
    return [];
  }
}

/**
 * Count open reports about a user (for admin/moderation)
 */
export async function getReportCountForUser(
  reportedUserId: string
): Promise<number> {
  const supabase = await createClient();

  try {
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_user_id', reportedUserId)
      .eq('status', 'open');

    return count ?? 0;
  } catch (error) {
    console.error('Get report count failed:', error);
    return 0;
  }
}

/**
 * Get all open reports (admin only)
 * Note: In production, this should be protected by admin middleware
 */
export async function getAllOpenReports(
  context: AuthContext
): Promise<Report[]> {
  // TODO: Check if user is admin
  // if (!isAdmin(context.user)) {
  //   throw new ForbiddenError('Only admins can view all reports');
  // }

  const supabase = await createClient();

  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (reports || []).map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reportedUserId: r.reported_user_id,
      reportedListingId: r.reported_listing_id,
      reason: r.reason as ReportReason,
      description: r.description,
      status: r.status as ReportStatus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (error) {
    console.error('Get all reports failed:', error);
    return [];
  }
}
