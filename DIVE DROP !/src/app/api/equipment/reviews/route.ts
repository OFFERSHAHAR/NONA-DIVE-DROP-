/**
 * POST /api/equipment/reviews - Create review for equipment
 * GET /api/equipment/reviews?listing_id=... - Get reviews for listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/actions';
import { createEquipmentReviewSchema } from '@/lib/equipment/schemas';
import {
  createEquipmentReview,
  getEquipmentReviews,
  getEquipmentRental,
} from '@/lib/equipment/equipment-client';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuth();
    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const input = createEquipmentReviewSchema.parse(body);

    // Verify user is the renter of this rental
    const rental = await getEquipmentRental(input.rental_id);
    if (!rental) {
      return NextResponse.json(
        { success: false, error: 'Rental not found' },
        { status: 404 }
      );
    }

    if (rental.renter_id !== auth.user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the renter can review this equipment' },
        { status: 403 }
      );
    }

    if (rental.status !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Can only review completed rentals',
        },
        { status: 400 }
      );
    }

    // Create review
    const review = await createEquipmentReview(auth.user.id, input);

    return NextResponse.json(
      {
        success: true,
        data: review,
        message: 'Review created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Equipment Review Creation Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const listingId = request.nextUrl.searchParams.get('listing_id');

    if (!listingId) {
      return NextResponse.json(
        { success: false, error: 'listing_id is required' },
        { status: 400 }
      );
    }

    const reviews = await getEquipmentReviews(listingId);

    return NextResponse.json({
      success: true,
      data: reviews,
      count: reviews.length,
    });
  } catch (error) {
    console.error('[Get Equipment Reviews Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get reviews' },
      { status: 500 }
    );
  }
}
