import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isModerator } from '@/lib/admin/permissions';

export async function GET(request: NextRequest) {
  try {
    // Verify moderator or admin role
    const hasPermission = await isModerator();
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Moderator access required' }, { status: 403 });
    }

    const supabase = await createClient();

    // Get query parameters
    const divesite = request.nextUrl.searchParams.get('dive_site_id');
    const instructor = request.nextUrl.searchParams.get('instructor_id');
    const username = request.nextUrl.searchParams.get('search');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    let query = supabase
      .from('photos')
      .select(
        `
        id,
        user_id,
        file_url,
        thumbnail_url,
        title,
        description,
        status,
        quality_score,
        uploaded_at,
        dive_site_id,
        instructor_id,
        profiles:user_id(id, username, email),
        dive_sites:dive_site_id(id, name),
        instructors:instructor_id(id, username)
        `,
        { count: 'exact' }
      )
      .eq('status', 'pending')
      .order('uploaded_at', { ascending: false });

    if (divesite) {
      query = query.eq('dive_site_id', divesite);
    }

    if (instructor) {
      query = query.eq('instructor_id', instructor);
    }

    const { data: pendingPhotos, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      photos: pendingPhotos || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get pending photos error:', error);
    return NextResponse.json(
      { error: 'Failed to get pending photos' },
      { status: 500 }
    );
  }
}
