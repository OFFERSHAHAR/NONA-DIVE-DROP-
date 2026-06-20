/**
 * Create a new equipment rental booking
 * POST /api/equipment/rentals/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { calculateRentalFinancials, calculateRentalDays } from '@/lib/rentals/commission';

export const runtime = 'nodejs';

const createRentalSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  deposit_cents: z.number().int().nonnegative().optional(),
  insurance_enabled: z.boolean().optional().default(false),
  notes: z.string().max(500).optional(),
});

type RequestBody = z.infer<typeof createRentalSchema>;

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    // Validate input
    const validationResult = createRentalSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { listing_id, start_date, end_date, insurance_enabled, notes, deposit_cents } =
      validationResult.data;

    // Get Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user (renter)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Parse dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Validate dates
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    const rentalDays = calculateRentalDays(startDate, endDate);

    // Get listing with equipment details
    const { data: listing, error: listingError } = await supabase
      .from('equipment_listings')
      .select(`
        id,
        lister_id,
        equipment_id,
        daily_price_cents,
        commission_rate,
        insurance_available,
        insurance_price_cents,
        deposit_required_cents,
        is_available,
        available_quantity,
        equipment (
          id,
          name,
          category,
          brand
        )
      `)
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Equipment listing not found' },
        { status: 404 }
      );
    }

    // Check availability
    if (!listing.is_available || listing.available_quantity <= 0) {
      return NextResponse.json(
        { error: 'Equipment is not available for rental' },
        { status: 400 }
      );
    }

    // Check for conflicting rentals
    const { data: conflictingRentals } = await supabase
      .from('equipment_rentals')
      .select('id')
      .eq('listing_id', listing_id)
      .in('status', ['confirmed', 'active'])
      .lte('start_date', endDate.toISOString().split('T')[0])
      .gte('end_date', startDate.toISOString().split('T')[0]);

    if (conflictingRentals && conflictingRentals.length > 0) {
      return NextResponse.json(
        { error: 'Equipment is already booked for those dates' },
        { status: 409 }
      );
    }

    // Calculate financials
    const insuranceCents =
      insurance_enabled && listing.insurance_price_cents ? listing.insurance_price_cents : 0;
    const depositCentsToUse = deposit_cents || listing.deposit_required_cents || 0;

    const financials = calculateRentalFinancials({
      dailyPriceCents: listing.daily_price_cents,
      rentalDays,
      commissionRate: listing.commission_rate,
      depositCents: depositCentsToUse,
      insuranceCents,
    });

    // Create rental record
    const { data: rental, error: rentalError } = await supabase
      .from('equipment_rentals')
      .insert({
        renter_id: user.id,
        lister_id: listing.lister_id,
        listing_id: listing.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        rental_days: rentalDays,
        daily_price_cents: listing.daily_price_cents,
        subtotal_cents: financials.subtotalCents,
        deposit_cents: financials.depositCents,
        insurance_cents: financials.insuranceCents,
        rental_cost_cents: financials.rentalCostCents,
        total_cost_cents: financials.totalCostCents,
        commission_rate: listing.commission_rate,
        status: 'pending',
        notes,
      })
      .select()
      .single();

    if (rentalError || !rental) {
      return NextResponse.json(
        { error: 'Failed to create rental booking' },
        { status: 500 }
      );
    }

    // Create commission record (placeholder, will be updated when payment completes)
    await supabase.from('rental_commissions').insert({
      rental_id: rental.id,
      lister_id: listing.lister_id,
      renter_id: user.id,
      rental_cost_cents: financials.rentalCostCents,
      commission_rate: listing.commission_rate,
      commission_cents: financials.commissionCents,
      status: 'pending',
    });

    return NextResponse.json(
      {
        success: true,
        rental: {
          id: rental.id,
          equipment_name: listing.equipment?.name,
          start_date: rental.start_date,
          end_date: rental.end_date,
          rental_days: rentalDays,
          daily_price: `₪${(listing.daily_price_cents / 100).toFixed(2)}`,
          subtotal: `₪${(financials.subtotalCents / 100).toFixed(2)}`,
          insurance: insurance_enabled
            ? `₪${(financials.insuranceCents / 100).toFixed(2)}`
            : null,
          rental_cost: `₪${(financials.rentalCostCents / 100).toFixed(2)}`,
          deposit: `₪${(financials.depositCents / 100).toFixed(2)}`,
          total_cost: `₪${(financials.totalCostCents / 100).toFixed(2)}`,
          commission_breakdown: {
            rental_cost: `₪${(financials.rentalCostCents / 100).toFixed(2)}`,
            commission_rate: `${(listing.commission_rate * 100).toFixed(0)}%`,
            commission_amount: `₪${(financials.commissionCents / 100).toFixed(2)}`,
            to_lister: `₪${(financials.netToListerCents / 100).toFixed(2)}`,
          },
          status: rental.status,
          next_step: 'Payment required',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Rental creation error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
