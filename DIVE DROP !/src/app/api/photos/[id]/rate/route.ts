import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

type RatingInput = z.infer<typeof ratingSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate request body
    const body = await request.json();
    const data = ratingSchema.parse(body);

    // Get auth header
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Create client with user token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if photo exists
    const { data: photo, error: photoError } = await supabase
      .from('user_photos')
      .select('id, user_id')
      .eq('id', params.id)
      .single();

    if (photoError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Prevent self-rating
    if (photo.user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot rate your own photos' },
        { status: 400 }
      );
    }

    // Upsert rating
    const { data: rating, error: ratingError } = await supabase
      .from('user_photo_ratings')
      .upsert(
        {
          photo_id: params.id,
          user_id: user.id,
          rating: data.rating,
          comment: data.comment || null,
        },
        {
          onConflict: 'photo_id,user_id',
        }
      )
      .select()
      .single();

    if (ratingError) {
      console.error('Rating error:', ratingError);
      return NextResponse.json(
        { error: 'Failed to save rating' },
        { status: 500 }
      );
    }

    // Update photo stats
    const { data: stats, error: statsError } = await supabase
      .rpc('update_photo_stats', { p_photo_id: params.id });

    if (statsError) {
      console.error('Stats update error:', statsError);
      // Don't fail the request if stats update fails
    }

    return NextResponse.json({
      success: true,
      rating,
      message: 'Rating saved successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid rating data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Rating error:', error);
    return NextResponse.json(
      { error: 'Failed to process rating' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth header (optional for viewing ratings)
    const authHeader = request.headers.get('Authorization') || '';
    let userId: string | null = null;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    // Get all ratings for photo
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    const { data: ratings, error: ratingsError } = await supabase
      .from('user_photo_ratings')
      .select('id, rating, comment, created_at')
      .eq('photo_id', params.id)
      .order('created_at', { ascending: false });

    if (ratingsError) {
      console.error('Fetch ratings error:', ratingsError);
      return NextResponse.json(
        { error: 'Failed to fetch ratings' },
        { status: 500 }
      );
    }

    // Get user's own rating if authenticated
    let userRating = null;
    if (userId) {
      const { data: ownRating } = await supabase
        .from('user_photo_ratings')
        .select('id, rating, comment, created_at')
        .eq('photo_id', params.id)
        .eq('user_id', userId)
        .single();

      userRating = ownRating;
    }

    return NextResponse.json({
      ratings: ratings || [],
      userRating,
      count: ratings?.length || 0,
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}
