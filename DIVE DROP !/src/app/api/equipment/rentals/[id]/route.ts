/**
 * GET /api/equipment/rentals/[id] - Get rental details
 * POST /api/equipment/rentals/[id]/approve - Approve rental request (lister)
 * POST /api/equipment/rentals/[id]/reject - Reject rental request (lister)
 * POST /api/equipment/rentals/[id]/return - Return equipment (renter)
 * POST /api/equipment/rentals/[id]/complete - Complete rental (lister)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/actions';
import {
  approveEquipmentRentalSchema,
  returnEquipmentSchema,
} from '@/lib/equipment/schemas';
import {
  getEquipmentRental,
  approveEquipmentRental,
  rejectEquipmentRental,
  returnEquipment,
  completeEquipmentRental,
} from '@/lib/equipment/equipment-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rental = await getEquipmentRental(id);

    if (!rental) {
      return NextResponse.json(
        { success: false, error: 'Rental not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rental,
    });
  } catch (error) {
    console.error('[Get Rental Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get rental details' },
      { status: 500 }
    );
  }
}

// ============================================================================
// LISTER ACTIONS
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const auth = await getCurrentUser();
    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get action from query params
    const action = request.nextUrl.searchParams.get('action');

    const { id } = await params;
    const rental = await getEquipmentRental(id);
    if (!rental) {
      return NextResponse.json(
        { success: false, error: 'Rental not found' },
        { status: 404 }
      );
    }

    // Handle approve action
    if (action === 'approve') {
      if (rental.lister_id !== auth.user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Only the lister can approve this rental',
          },
          { status: 403 }
        );
      }

      if (rental.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Rental is not in pending status' },
          { status: 400 }
        );
      }

      const approved = await approveEquipmentRental(id, auth.user.id);

      return NextResponse.json({
        success: true,
        data: approved,
        message: 'Rental approved successfully',
      });
    }

    // Handle reject action
    if (action === 'reject') {
      if (rental.lister_id !== auth.user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Only the lister can reject this rental',
          },
          { status: 403 }
        );
      }

      if (rental.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Rental is not in pending status' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const reason = body.reason || 'No reason provided';

      const rejected = await rejectEquipmentRental(
        id,
        auth.user.id,
        reason
      );

      return NextResponse.json({
        success: true,
        data: rejected,
        message: 'Rental rejected successfully',
      });
    }

    // Handle return action
    if (action === 'return') {
      if (rental.renter_id !== auth.user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Only the renter can return this rental',
          },
          { status: 403 }
        );
      }

      if (rental.status !== 'active') {
        return NextResponse.json(
          { success: false, error: 'Rental is not active' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const input = returnEquipmentSchema.parse(body);

      const returned = await returnEquipment(id, auth.user.id, input);

      return NextResponse.json({
        success: true,
        data: returned,
        message: 'Equipment returned successfully',
      });
    }

    // Handle complete action (lister completes after damage assessment)
    if (action === 'complete') {
      if (rental.lister_id !== auth.user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Only the lister can complete this rental',
          },
          { status: 403 }
        );
      }

      if (rental.status !== 'damage_pending') {
        return NextResponse.json(
          {
            success: false,
            error: 'Rental is not awaiting damage assessment',
          },
          { status: 400 }
        );
      }

      const completed = await completeEquipmentRental(id, auth.user.id);

      return NextResponse.json({
        success: true,
        data: completed,
        message: 'Rental completed successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Equipment Rental Action Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process rental action' },
      { status: 500 }
    );
  }
}
