import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/free-diving-sessions - Browse all sessions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Query parameters
    const sessionType = searchParams.get('sessionType');
    const level = searchParams.get('level');
    const location = searchParams.get('location');
    const startDate = searchParams.get('startDate');
    const maxPrice = searchParams.get('maxPrice');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    let query = supabase
      .from('free_diving_sessions')
      .select('*', { count: 'exact' })
      .eq('status', 'scheduled')
      .order('start_date', { ascending: true });

    // Apply filters
    if (sessionType) {
      query = query.eq('session_type', sessionType);
    }

    if (level) {
      query = query.eq('level', level);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (startDate) {
      query = query.gte('start_date', startDate);
    }

    if (maxPrice) {
      query = query.lte('price_shekel', parseFloat(maxPrice));
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
      sessions: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/free-diving-sessions - Create a new session (instructor only)
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    const {
      title,
      description,
      sessionType,
      level,
      location,
      startDate,
      startTime,
      capacity,
      price,
      durationMinutes,
      imageUrl,
      maxDepth,
    } = body;

    if (!title || !description || !sessionType || !level || !location || !startDate || !startTime || !capacity || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create session
    const { data, error } = await supabase
      .from('free_diving_sessions')
      .insert([{
        instructor_id: user.id,
        title,
        description,
        session_type: sessionType,
        level,
        location,
        start_date: startDate,
        start_time: startTime,
        capacity,
        price_shekel: price,
        duration_minutes: durationMinutes,
        image_url: imageUrl,
        max_depth_meters: maxDepth,
        status: 'scheduled',
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
