/**
 * POST /api/training/enroll
 * Enroll a user in a training program
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
    const { training_program_id, payment_status } = body;

    if (!training_program_id) {
      return NextResponse.json(
        { success: false, error: 'training_program_id is required' },
        { status: 400 }
      );
    }

    // Check if training program exists
    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .select('id, is_active, status, current_enrollment, max_students, depth_level')
      .eq('id', training_program_id)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { success: false, error: 'Training program not found' },
        { status: 404 }
      );
    }

    if (!program.is_active || program.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Training program is not active' },
        { status: 400 }
      );
    }

    if (program.current_enrollment >= program.max_students) {
      return NextResponse.json(
        { success: false, error: 'Training program is full' },
        { status: 400 }
      );
    }

    // Check eligibility based on user level
    const { data: isEligible } = await supabase.rpc('check_training_level_eligibility', {
      p_user_id: user.id,
      p_training_program_id: training_program_id,
    });

    if (!isEligible) {
      return NextResponse.json(
        {
          success: false,
          error: `You are not eligible for this training level. Please complete prerequisites for ${program.depth_level} level training.`,
        },
        { status: 403 }
      );
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('training_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('training_program_id', training_program_id)
      .neq('status', 'cancelled')
      .single();

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'You are already enrolled in this training program' },
        { status: 400 }
      );
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('training_enrollments')
      .insert({
        user_id: user.id,
        training_program_id,
        payment_status: payment_status || 'pending',
        status: 'enrolled',
      })
      .select()
      .single();

    if (enrollmentError) throw enrollmentError;

    // Mark recommendation as booked if one exists
    await supabase
      .from('training_recommendations')
      .update({
        was_booked: true,
        booked_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('training_program_id', training_program_id);

    return NextResponse.json(
      {
        success: true,
        data: enrollment,
        message: 'Successfully enrolled in training program',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error enrolling in training:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enroll in training program' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/training/enroll
 * Get user's enrollment status for a training program
 */
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

    const training_program_id = request.nextUrl.searchParams.get('training_program_id');

    if (!training_program_id) {
      return NextResponse.json(
        { success: false, error: 'training_program_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('training_enrollments')
      .select(
        `*,
        training_programs!inner(
          id,
          name,
          depth_level,
          location,
          price_shekel
        )`
      )
      .eq('user_id', user.id)
      .eq('training_program_id', training_program_id)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json(
        { success: true, data: null, message: 'Not enrolled' },
        { status: 200 }
      );
    }

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error checking enrollment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check enrollment status' },
      { status: 500 }
    );
  }
}
