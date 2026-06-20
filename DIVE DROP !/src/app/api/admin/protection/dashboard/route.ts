/**
 * GET /api/admin/protection/dashboard
 * Admin dashboard for protection system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplaintService } from '@/lib/protection/complaint-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin only' },
        { status: 403 }
      );
    }

    const complaintService = new ComplaintService();

    // Get statistics
    const [{ count: totalComplaints }, { count: openComplaints },
           { count: pendingDamageClaims },
           { data: blacklistedUsers }] = await Promise.all([
      supabase
        .from('user_complaints')
        .select('count', { count: 'exact' }),

      supabase
        .from('user_complaints')
        .select('count', { count: 'exact' })
        .eq('status', 'open'),

      supabase
        .from('damage_claims')
        .select('count', { count: 'exact' })
        .eq('status', 'claimed'),

      supabase
        .from('user_reputation_scores')
        .select('user_id, total_score')
        .eq('is_blacklisted', true),
    ]);

    const openComplaints_data = await complaintService.getOpenComplaints(5);
    const pendingClaims = await complaintService.getPendingDamageClaims();

    return NextResponse.json({
      dashboard_stats: {
        total_complaints: totalComplaints || 0,
        open_complaints: openComplaints || 0,
        pending_damage_claims: pendingDamageClaims || 0,
        blacklisted_users: (blacklistedUsers || []).length,
      },
      recent_open_complaints: openComplaints_data.slice(0, 5),
      pending_damage_claims: pendingClaims.slice(0, 5),
      blacklisted_users: blacklistedUsers || [],
    });
  } catch (error) {
    console.error('Error fetching protection dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
