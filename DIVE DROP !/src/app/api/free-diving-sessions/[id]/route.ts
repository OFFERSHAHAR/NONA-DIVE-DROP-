import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/free-diving-sessions/[id] - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('free_diving_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get bookings (for capacity info)
    const { data: bookings } = await supabase
      .from('free_diving_session_bookings')
      .select('id')
      .eq('session_id', id)
      .eq('status', 'confirmed');

    // Get reviews
    const { data: reviews } = await supabase
      .from('free_diving_session_reviews')
      .select('*')
      .eq('session_id', id)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      session,
      participantCount: bookings?.length || 0,
      reviews: reviews || [],
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// PATCH /api/free-diving-sessions/[id] - Update session
export async function PATCH(
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

    // Check if user is the instructor
    const { data: session } = await supabase
      .from('free_diving_sessions')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (!session || session.instructor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update session
    const { data, error } = await supabase
      .from('free_diving_sessions')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// DELETE /api/free-diving-sessions/[id] - Delete session
export async function DELETE(
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

    // Check if user is the instructor
    const { data: session } = await supabase
      .from('free_diving_sessions')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (!session || session.instructor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Soft delete by updating status
    const { error } = await supabase
      .from('free_diving_sessions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
