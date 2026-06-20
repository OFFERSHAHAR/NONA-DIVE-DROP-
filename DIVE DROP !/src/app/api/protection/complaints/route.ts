/**
 * POST /api/protection/complaints
 * File a complaint against a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplaintService } from '@/lib/protection/complaint-service';
import { FileComplaintRequest } from '@/types/protection';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user (complainant)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: FileComplaintRequest = await request.json();

    // Validate request
    if (
      !body.complained_against_user_id ||
      !body.booking_id ||
      !body.complaint_type ||
      !body.title ||
      !body.description
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prevent self-complaints
    if (body.complained_against_user_id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot file complaint against yourself' },
        { status: 400 }
      );
    }

    const complaintService = new ComplaintService();
    const complaint = await complaintService.fileComplaint(currentUser.id, body);

    return NextResponse.json(complaint, { status: 201 });
  } catch (error: any) {
    console.error('Error filing complaint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to file complaint' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/protection/complaints
 * Get complaints filed by or against current user
 */

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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'against'; // 'against', 'by', or 'all'

    const complaintService = new ComplaintService();

    if (type === 'against') {
      // Complaints against user
      const complaints =
        await complaintService.getComplaintsAgainstUser(currentUser.id);
      return NextResponse.json({
        complaints,
        total: complaints.length,
      });
    } else if (type === 'by') {
      // Complaints filed by user
      const { data, error } = await supabase
        .from('user_complaints')
        .select('*')
        .eq('complainant_user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({
        complaints: data || [],
        total: (data || []).length,
      });
    }

    // Both
    const [against, by] = await Promise.all([
      complaintService.getComplaintsAgainstUser(currentUser.id),
      supabase
        .from('user_complaints')
        .select('*')
        .eq('complainant_user_id', currentUser.id),
    ]);

    return NextResponse.json({
      complaints_against_you: against,
      complaints_by_you: by.data || [],
      total_against: against.length,
      total_by: (by.data || []).length,
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    );
  }
}
