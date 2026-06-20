import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { confirmBookingSchema } from '@/lib/bookings/schemas';
import {
  withProviderAuth,
  successResponse,
  errorResponse,
  withRateLimit,
  rateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/bookings/middleware';
import { canTransition } from '@/lib/bookings/utils';

/**
 * POST /api/bookings/[id]/confirm
 * Provider confirms or rejects booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: context, error: authError } = await withProviderAuth(request);
  if (authError) return authError;

  const rateLimiter = withRateLimit(rateLimitConfigs.confirmation);
  const limitCheck = rateLimiter(`bookings:confirm:${context!.userId}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = confirmBookingSchema.safeParse(body);

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
      .select('id, service_provider_id, status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        errorResponse('Booking not found'),
        { status: 404 }
      );
    }

    if (booking.service_provider_id !== context!.userId) {
      return NextResponse.json(
        errorResponse('Only assigned provider can confirm this booking'),
        { status: 403 }
      );
    }

    if (booking.status !== 'pending_confirmation') {
      return NextResponse.json(
        errorResponse('Booking is not pending confirmation'),
        { status: 400 }
      );
    }

    const newStatus = validation.data.confirm ? 'confirmed' : 'rejected';

    // Update booking status
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        confirmed_at: validation.data.confirm ? new Date().toISOString() : null,
        notes: validation.data.notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Add message from provider
    if (validation.data.notes) {
      await supabase.from('booking_messages').insert([
        {
          booking_id: id,
          sender_user_id: context!.userId,
          message: validation.data.notes,
          is_provider_message: true,
        },
      ]);
    }

    // TODO: Send notification to divers
    // await sendBookingNotification(...)

    return NextResponse.json(successResponse(updated));
  } catch (error: any) {
    console.error('POST /api/bookings/[id]/confirm error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}
