/**
 * GET /api/training/recommendations
 * Get personalized training recommendations for the authenticated user
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '5'), 20);

    // Ensure user has a training progress record
    const { data: existingProgress } = await supabase
      .from('user_training_progress')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!existingProgress) {
      // Create initial progress record for new users
      await supabase.from('user_training_progress').insert({
        user_id: user.id,
        current_level: 'beginner',
        depth_achieved_meters: 0,
      });
    }

    // Call the RPC function to get recommendations
    const { data, error } = await supabase.rpc('get_training_recommendations', {
      p_user_id: user.id,
      p_limit: limit,
    });

    if (error) {
      console.error('Error calling RPC:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching training recommendations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch training recommendations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/training/recommendations/mark-viewed
 * Mark a recommendation as viewed
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { training_program_id } = body;

    if (!training_program_id) {
      return NextResponse.json(
        { success: false, error: 'training_program_id is required' },
        { status: 400 }
      );
    }

    // Update recommendation status
    const { data, error } = await supabase
      .from('training_recommendations')
      .update({
        was_viewed: true,
        viewed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('training_program_id', training_program_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Recommendation marked as viewed',
    });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update recommendation' },
      { status: 500 }
    );
  }
}
