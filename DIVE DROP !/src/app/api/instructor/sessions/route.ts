import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/instructor/sessions - Get instructor's sessions and roster
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const status = searchParams.get('status');

    // Get instructor's sessions
    let query = supabase
      .from('free_diving_sessions')
      .select('*')
      .eq('instructor_id', user.id)
      .order('start_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      return NextResponse.json(
        { error: sessionsError.message },
        { status: 500 }
      );
    }

    // Get roster for specific session if requested
    let roster = [];
    if (sessionId) {
      const { data, error } = await supabase
        .from('free_diving_session_roster')
        .select(`
          *,
          booking:free_diving_session_bookings(
            id,
            status,
            payment_status,
            booked_at
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error) {
        roster = data || [];
      }
    }

    return NextResponse.json({
      sessions: sessions || [],
      roster,
    });
  } catch (error) {
    console.error('Error fetching instructor sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
