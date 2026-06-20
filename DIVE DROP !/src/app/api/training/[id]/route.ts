/**
 * GET /api/training/[id]
 * Get a specific training program by ID
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('training_programs')
      .select(
        `*,
        freediving_instructors!inner(
          id,
          user_id,
          bio,
          avatar_url,
          years_experience,
          average_rating,
          total_reviews,
          total_sessions_completed,
          primary_location
        )`
      )
      .eq('id', params.id)
      .eq('is_active', true)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Training program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching training program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch training program' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/training/[id]
 * Update a training program (instructor only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: program, error: fetchError } = await supabase
      .from('training_programs')
      .select('instructor_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !program) {
      return NextResponse.json(
        { success: false, error: 'Training program not found' },
        { status: 404 }
      );
    }

    // Check if user owns this program
    const { data: instructor, error: instructorError } = await supabase
      .from('freediving_instructors')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', program.instructor_id)
      .single();

    if (!instructor || instructorError) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this training program' },
        { status: 403 }
      );
    }

    // Parse and update
    const body = await request.json();

    const { data, error } = await supabase
      .from('training_programs')
      .update({
        name: body.name,
        description: body.description,
        price_shekel: body.price_shekel,
        location: body.location,
        next_start_date: body.next_start_date,
        is_active: body.is_active,
        status: body.status,
        max_students: body.max_students,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Training program updated successfully',
    });
  } catch (error) {
    console.error('Error updating training program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update training program' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/training/[id]
 * Delete a training program (instructor only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: program, error: fetchError } = await supabase
      .from('training_programs')
      .select('instructor_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !program) {
      return NextResponse.json(
        { success: false, error: 'Training program not found' },
        { status: 404 }
      );
    }

    // Check if user owns this program
    const { data: instructor, error: instructorError } = await supabase
      .from('freediving_instructors')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', program.instructor_id)
      .single();

    if (!instructor || instructorError) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this training program' },
        { status: 403 }
      );
    }

    // Soft delete by marking as inactive
    const { data, error } = await supabase
      .from('training_programs')
      .update({
        is_active: false,
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Training program deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting training program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete training program' },
      { status: 500 }
    );
  }
}
