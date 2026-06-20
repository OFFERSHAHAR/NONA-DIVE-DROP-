import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  withBookingAuth,
  successResponse,
  errorResponse,
  withRateLimit,
  rateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/bookings/middleware';

const messageSchema = z.object({
  message: z.string().min(1).max(1000),
});

/**
 * GET /api/bookings/[id]/messages
 * Get booking messages
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

    // Verify user is part of booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, buddy_user_id, service_provider_id')
      .eq('id', id)
      .single();

    if (bookingError) {
      return NextResponse.json(
        errorResponse('Booking not found'),
        { status: 404 }
      );
    }

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

    // Get messages
    const { data: messages, error } = await supabase
      .from('booking_messages')
      .select(`
        id,
        message,
        is_provider_message,
        created_at,
        sender:sender_user_id(id, first_name, last_name, avatar_url)
      `)
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(successResponse(messages || []));
  } catch (error: any) {
    console.error('GET /api/bookings/[id]/messages error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/[id]/messages
 * Send a message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return authError;

  const rateLimiter = withRateLimit(rateLimitConfigs.bookings);
  const limitCheck = rateLimiter(`bookings:messages:${context!.userId}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = messageSchema.safeParse(body);

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

    // Verify user is part of booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, buddy_user_id, service_provider_id')
      .eq('id', id)
      .single();

    if (bookingError) {
      return NextResponse.json(
        errorResponse('Booking not found'),
        { status: 404 }
      );
    }

    const isProvider = booking.service_provider_id === context!.userId;
    if (
      booking.user_id !== context!.userId &&
      booking.buddy_user_id !== context!.userId &&
      !isProvider
    ) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 403 }
      );
    }

    // Create message
    const { data: message, error } = await supabase
      .from('booking_messages')
      .insert([
        {
          booking_id: id,
          sender_user_id: context!.userId,
          message: validation.data.message,
          is_provider_message: isProvider,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // TODO: Send real-time notification
    // TODO: Send email/SMS notification

    return NextResponse.json(successResponse(message), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/bookings/[id]/messages error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}
