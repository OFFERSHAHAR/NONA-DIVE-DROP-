import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/free-diving-sessions/[id]/reviews - Get reviews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('free_diving_session_reviews')
      .select('*')
      .eq('session_id', id)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ reviews: data || [] });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/free-diving-sessions/[id]/reviews - Create a review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      rating,
      title,
      comment,
      instructionQualityRating,
      safetyRating,
      valueRating,
    } = body;

    // Validate
    if (!rating || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user attended the session
    const { data: booking } = await supabase
      .from('free_diving_session_bookings')
      .select('id, attended')
      .eq('session_id', id)
      .eq('user_id', user.id)
      .single();

    // Get the session to check if it's completed
    const { data: session } = await supabase
      .from('free_diving_sessions')
      .select('status')
      .eq('id', id)
      .single();

    if (session?.status !== 'completed') {
      return NextResponse.json(
        { error: 'You can only review completed sessions' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('free_diving_session_reviews')
      .select('id')
      .eq('session_id', id)
      .eq('reviewer_user_id', user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this session' },
        { status: 400 }
      );
    }

    // Create review
    const { data: review, error } = await supabase
      .from('free_diving_session_reviews')
      .insert([{
        session_id: id,
        reviewer_user_id: user.id,
        booking_id: booking?.id,
        rating,
        title,
        comment,
        instruction_quality_rating: instructionQualityRating,
        safety_rating: safetyRating,
        value_rating: valueRating,
        moderation_status: 'pending', // Awaiting moderation
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
