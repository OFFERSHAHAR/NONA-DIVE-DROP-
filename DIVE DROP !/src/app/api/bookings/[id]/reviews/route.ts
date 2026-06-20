import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { bookingReviewSchema } from '@/lib/bookings/schemas';
import {
  withBookingAuth,
  successResponse,
  errorResponse,
} from '@/lib/bookings/middleware';

/**
 * GET /api/bookings/[id]/reviews
 * Get reviews for a booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data: reviews, error } = await supabase
      .from('booking_reviews')
      .select(`
        id,
        rating,
        review_text,
        would_recommend,
        review_type,
        created_at,
        reviewer:reviewer_user_id(id, first_name, last_name, avatar_url),
        reviewed:reviewed_user_id(id, first_name, last_name)
      `)
      .eq('booking_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(successResponse(reviews || []));
  } catch (error: any) {
    console.error('GET /api/bookings/[id]/reviews error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/[id]/reviews
 * Submit a review for booking
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
    const validation = bookingReviewSchema.safeParse(body);

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

    // Get booking to check authorization
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, buddy_user_id, status')
      .eq('id', id)
      .single();

    if (bookingError) {
      return NextResponse.json(
        errorResponse('Booking not found'),
        { status: 404 }
      );
    }

    // Check if user is a participant
    if (
      booking.user_id !== context!.userId &&
      booking.buddy_user_id !== context!.userId
    ) {
      return NextResponse.json(
        errorResponse('Only booking participants can submit reviews'),
        { status: 403 }
      );
    }

    // Determine who is being reviewed
    const reviewedUserId =
      booking.user_id === context!.userId
        ? booking.buddy_user_id
        : booking.user_id;

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('booking_reviews')
      .insert([
        {
          booking_id: id,
          reviewer_user_id: context!.userId,
          reviewed_user_id: reviewedUserId,
          rating: validation.data.rating,
          review_text: validation.data.review_text,
          would_recommend: validation.data.would_recommend,
          review_type: 'diver_to_diver',
        },
      ])
      .select()
      .single();

    if (reviewError) throw reviewError;

    return NextResponse.json(successResponse(review), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/bookings/[id]/reviews error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}
