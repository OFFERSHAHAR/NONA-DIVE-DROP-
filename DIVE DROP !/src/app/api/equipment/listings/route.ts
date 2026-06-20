/**
 * GET /api/equipment/listings - Browse all equipment listings
 * POST /api/equipment/listings - Create new equipment listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@/lib/auth/actions';
import {
  createEquipmentListingSchema,
  searchEquipmentListingsSchema,
} from '@/lib/equipment/schemas';
import {
  createEquipmentListing,
  searchEquipmentListings,
} from '@/lib/equipment/equipment-client';

export async function GET(request: NextRequest) {
  try {
    // Parse search params
    const searchParams = request.nextUrl.searchParams;

    const input = searchEquipmentListingsSchema.parse({
      equipment_type: searchParams.get('equipment_type'),
      condition: searchParams.get('condition'),
      location_lat: searchParams.get('location_lat')
        ? parseFloat(searchParams.get('location_lat')!)
        : undefined,
      location_lng: searchParams.get('location_lng')
        ? parseFloat(searchParams.get('location_lng')!)
        : undefined,
      max_distance_km: searchParams.get('max_distance_km')
        ? parseFloat(searchParams.get('max_distance_km')!)
        : 50,
      price_min: searchParams.get('price_min')
        ? parseInt(searchParams.get('price_min')!)
        : undefined,
      price_max: searchParams.get('price_max')
        ? parseInt(searchParams.get('price_max')!)
        : undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      sort_by: searchParams.get('sort_by') || 'newest',
    });

    const result = await searchEquipmentListings(input);

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
    console.error('[Equipment Search Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to search equipment listings' },
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
    const input = createEquipmentListingSchema.parse(body);

    // Create listing
    const listing = await createEquipmentListing(auth.user.id, input);

    return NextResponse.json(
      {
        success: true,
        data: listing,
        message: 'Equipment listing created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Equipment Listing Creation Error]', error);

    if (error instanceof Error) {
      // Check if it's a Zod validation error
      if (error.message.includes('validation')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create equipment listing' },
      { status: 500 }
    );
  }
}
