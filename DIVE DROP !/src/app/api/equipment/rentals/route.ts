/**
 * GET /api/equipment/rentals - Get my rentals
 * POST /api/equipment/rentals - Request a rental
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/actions';
import {
  myRentalsSchema,
  requestEquipmentRentalSchema,
  validateRentalDates,
} from '@/lib/equipment/schemas';
import {
  getMyRentals,
  requestEquipmentRental,
  getEquipmentListing,
} from '@/lib/equipment/equipment-client';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuth();
    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const input = myRentalsSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      status: searchParams.get('status') || 'all',
      sort_by: searchParams.get('sort_by') || 'recent',
    });

    const result = await getMyRentals(auth.user.id, input);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        hasMore: input.page * input.limit < result.total,
      },
    });
  } catch (error) {
    console.error('[Get My Rentals Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get your rentals' },
      { status: 500 }
    );
  }
}

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

    // Parse and validate request body
    const body = await request.json();
    const input = requestEquipmentRentalSchema.parse(body);

    // Get listing to validate dates
    const listing = await getEquipmentListing(input.listing_id);
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Equipment listing not found' },
        { status: 404 }
      );
    }

    // Validate rental dates against listing availability
    const dateValidation = validateRentalDates(
      input.rental_start,
      input.rental_end,
      listing
    );

    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, error: dateValidation.error },
        { status: 400 }
      );
    }

    // Create rental request
    const rental = await requestEquipmentRental(auth.user.id, input);

    return NextResponse.json(
      {
        success: true,
        data: rental,
        message: 'Rental request created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Equipment Rental Request Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create rental request' },
      { status: 500 }
    );
  }
}
