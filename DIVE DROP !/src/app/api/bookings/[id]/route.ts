import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  updateBookingSchema,
  confirmBookingSchema,
  completeBookingSchema,
} from '@/lib/bookings/schemas';
import {
  withBookingAuth,
  successResponse,
  errorResponse,
  withRateLimit,
  rateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/bookings/middleware';
import { canTransition } from '@/lib/bookings/utils';

/**
 * GET /api/bookings/[id]
 * Get booking details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        users:user_id(id, first_name, last_name, avatar_url, diving_experience),
        buddy:buddy_user_id(id, first_name, last_name, avatar_url, diving_experience),
        dive_sites:dive_site_id(id, name, location, depth_range),
        provider:service_provider_id(id, first_name, last_name, avatar_url),
        messages:booking_messages(id, sender_user_id, message, created_at),
        reviews:booking_reviews(id, rating, review_text, would_recommend, created_at)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        errorResponse('Booking not found'),
        { status: 404 }
      );
    }

    // Check authorization
    if (
      booking.user_id !== context!.userId &&
      booking.buddy_user_id !== context!.userId &&
      booking.service_provider_id !== context!.userId
    ) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 403 }
      );
    }

    return NextResponse.json(successResponse(booking));
  } catch (error: any) {
    console.error('GET /api/bookings/[id] error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id]
 * Update booking (only draft bookings)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = updateBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues[0].message),
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    // Get existing booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        errorResponse('Booking not found'),
        { status: 404 }
      );
    }

    if (booking.user_id !== context!.userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 403 }
      );
    }

    if (booking.status !== 'draft') {
      return NextResponse.json(
        errorResponse('Can only update draft bookings'),
        { status: 400 }
      );
    }

    // Update booking
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(successResponse(updated));
  } catch (error: any) {
    console.error('PATCH /api/bookings/[id] error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings/[id]
 * Cancel booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    // Get booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, status, dive_date')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        errorResponse('Booking not found'),
        { status: 404 }
      );
    }

    if (booking.user_id !== context!.userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 403 }
      );
    }

    // Check if can cancel
    const diveDate = new Date(booking.dive_date);
    const hoursUntilDive = (diveDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);

    if (hoursUntilDive < 24) {
      return NextResponse.json(
        errorResponse('Cannot cancel within 24 hours of dive date'),
        { status: 400 }
      );
    }

    // Cancel booking
    const { data: cancelled, error: cancelError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: body.reason || 'User requested cancellation',
      })
      .eq('id', id)
      .select()
      .single();

    if (cancelError) throw cancelError;

    return NextResponse.json(successResponse(cancelled));
  } catch (error: any) {
    console.error('DELETE /api/bookings/[id] error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}
