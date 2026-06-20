/**
 * GET /api/equipment/listings/mine - Get my equipment listings
 * POST /api/equipment/listings/[id] - Update my listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/actions';
import { myEquipmentListingsSchema } from '@/lib/equipment/schemas';
import { getMyEquipmentListings } from '@/lib/equipment/equipment-client';

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
    const input = myEquipmentListingsSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      status: searchParams.get('status') || 'all',
      sort_by: searchParams.get('sort_by') || 'newest',
    });

    const result = await getMyEquipmentListings(auth.user.id, input);

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
    console.error('[Get My Listings Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get your listings' },
      { status: 500 }
    );
  }
}
