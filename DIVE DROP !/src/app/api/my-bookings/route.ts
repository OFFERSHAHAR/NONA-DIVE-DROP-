import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/my-bookings - Get user's session bookings
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
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    let query = supabase
      .from('free_diving_session_bookings')
      .select(`
        *,
        session:free_diving_sessions(
          id,
          title,
          description,
          session_type,
          level,
          location,
          start_date,
          start_time,
          price_shekel,
          image_url,
          capacity,
          current_participants,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('booked_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    const offset = page * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookings: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
