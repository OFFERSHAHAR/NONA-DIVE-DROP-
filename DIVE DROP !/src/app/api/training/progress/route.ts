/**
 * GET /api/training/progress
 * Get user's training progress and current level
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

    // Fetch user's training progress
    let { data: progress, error } = await supabase
      .from('user_training_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No progress record exists, create one
      const newProgress = {
        user_id: user.id,
        current_level: 'beginner' as const,
        depth_achieved_meters: 0,
        certifications: [],
        total_trainings_completed: 0,
        total_training_hours: 0,
        medical_clearance_valid: true,
        preferred_depth_min: 0,
        preferred_depth_max: 100,
        training_frequency_preference: 'monthly',
        trainings_this_year: 0,
        average_training_rating: 0,
      };

      const { data: created, error: createError } = await supabase
        .from('user_training_progress')
        .insert(newProgress)
        .select()
        .single();

      if (createError) throw createError;
      progress = created;
    } else if (error) {
      throw error;
    }

    // Fetch user's completed trainings for stats
    const { data: completedTrainings } = await supabase
      .from('training_enrollments')
      .select('completion_date, student_rating, depth_achieved')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    // Fetch user's current enrollments
    const { data: activeEnrollments } = await supabase
      .from('training_enrollments')
      .select(
        `*,
        training_programs!inner(
          id,
          name,
          depth_level,
          location,
          instructor_id
        )`
      )
      .eq('user_id', user.id)
      .in('status', ['enrolled', 'in_progress']);

    // Get next level information
    const { data: nextLevel } = await supabase.rpc('get_next_training_level', {
      p_user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        progress,
        activeEnrollments: activeEnrollments || [],
        completedTrainings: completedTrainings || [],
        nextLevel,
        stats: {
          completedCount: completedTrainings?.length || 0,
          activeCount: activeEnrollments?.length || 0,
          averageRating:
            completedTrainings && completedTrainings.length > 0
              ? (
                  completedTrainings.reduce((sum, t) => sum + (t.student_rating || 0), 0) /
                  completedTrainings.length
                ).toFixed(1)
              : 0,
          maxDepthAchieved: Math.max(
            progress?.depth_achieved_meters || 0,
            ...((completedTrainings?.map((t) => t.depth_achieved || 0) || []) as number[])
          ),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching training progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch training progress' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/training/progress
 * Update user's training progress
 */
export async function PUT(request: NextRequest) {
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

    // Update user progress
    const { data, error } = await supabase
      .from('user_training_progress')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Training progress updated successfully',
    });
  } catch (error) {
    console.error('Error updating training progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update training progress' },
      { status: 500 }
    );
  }
}
