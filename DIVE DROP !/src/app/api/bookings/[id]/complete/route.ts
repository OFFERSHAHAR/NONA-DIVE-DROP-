import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { completeBookingSchema } from '@/lib/bookings/schemas';
import {
  withBookingAuth,
  successResponse,
  errorResponse,
} from '@/lib/bookings/middleware';

/**
 * POST /api/bookings/[id]/complete
 * Mark booking as completed (after dive)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = completeBookingSchema.safeParse(body);

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

    // Get booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, buddy_user_id, status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        errorResponse('Booking not found'),
        { status: 404 }
      );
    }

    // Check authorization - only divers can mark as complete
    if (
      booking.user_id !== context!.userId &&
      booking.buddy_user_id !== context!.userId
    ) {
      return NextResponse.json(
        errorResponse('Only booking participants can mark as complete'),
        { status: 403 }
      );
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        errorResponse('Only confirmed bookings can be marked as complete'),
        { status: 400 }
      );
    }

    // Mark booking as completed
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: validation.data.notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update booking items with actual depth
    if (validation.data.depth_achieved) {
      await supabase
        .from('booking_items')
        .update({
          actual_depth: validation.data.depth_achieved,
          status: 'completed',
        })
        .eq('booking_id', id);
    }

    // TODO: Send completion notification
    // TODO: Trigger review request

    return NextResponse.json(successResponse(updated));
  } catch (error: any) {
    console.error('POST /api/bookings/[id]/complete error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}
