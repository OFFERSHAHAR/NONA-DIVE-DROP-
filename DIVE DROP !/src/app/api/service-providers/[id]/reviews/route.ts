import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createReviewSchema } from '@/lib/service-provider/schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const providerId = params.id;

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const { data: reviews, count, error } = await supabase
      .from('provider_reviews')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get provider for average rating
    const { data: provider } = await supabase
      .from('service_providers')
      .select('average_rating')
      .eq('id', providerId)
      .single();

    return NextResponse.json({
      items: reviews,
      total: count || 0,
      average_rating: provider?.average_rating || 0,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to get reviews' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const providerId = params.id;
    const body = await request.json();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate review data
    const validatedData = createReviewSchema.parse({
      provider_id: providerId,
      ...body,
    });

    // Create review
    const { data: review, error } = await supabase
      .from('provider_reviews')
      .insert({
        provider_id: providerId,
        reviewer_user_id: user.id,
        rating: validatedData.rating,
        title: validatedData.title,
        comment: validatedData.comment,
        safety_rating: validatedData.safety_rating,
        professionalism_rating: validatedData.professionalism_rating,
        value_rating: validatedData.value_rating,
        is_verified_booking: false,
        moderation_status: 'pending',
        is_helpful_count: 0,
        is_reported: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
