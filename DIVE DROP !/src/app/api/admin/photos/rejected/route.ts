import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const divesite = request.nextUrl.searchParams.get('dive_site_id');
    const instructor = request.nextUrl.searchParams.get('instructor_id');
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
        updated_at,
        dive_site_id,
        instructor_id,
        profiles:user_id(id, username, email),
        dive_sites:dive_site_id(id, name),
        instructors:instructor_id(id, username),
        photo_rejections(reason, rejection_notes, admin_id, created_at)
        `,
        { count: 'exact' }
      )
      .eq('status', 'rejected')
      .order('updated_at', { ascending: false });

    if (divesite) {
      query = query.eq('dive_site_id', divesite);
    }

    if (instructor) {
      query = query.eq('instructor_id', instructor);
    }

    const { data: rejectedPhotos, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      photos: rejectedPhotos || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get rejected photos error:', error);
    return NextResponse.json(
      { error: 'Failed to get rejected photos' },
      { status: 500 }
    );
  }
}
