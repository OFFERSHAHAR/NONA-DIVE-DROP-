import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/security/rate-limiter';

export const GET = withRateLimit(
  async (request: NextRequest) => {
    try {
      // Verify admin authorization
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const diveSiteId = searchParams.get('dive_site_id');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build base query
    let query = supabase
      .from('feedback')
      .select(
        `
        id,
        diver_id,
        dive_site_id,
        visibility_meters,
        temperature_celsius,
        current_strength,
        marine_life,
        notes,
        image_urls,
        submitted_at,
        created_at,
        auth.users!diver_id(email, user_metadata),
        dive_sites!dive_site_id(name)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (diveSiteId) {
      query = query.eq('dive_site_id', diveSiteId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('submitted_at', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('submitted_at', endDate.toISOString());
    }

    // Apply search
    if (search) {
      // Search by diver name or site name (basic text search)
      query = query.or(
        `auth.users.email.ilike.%${search}%,dive_sites.name.ilike.%${search}%`
      );
    }

    // Apply sorting
    let sortColumn = 'submitted_at';
    if (sortBy === 'rating') {
      sortColumn = 'visibility_meters';
    } else if (sortBy === 'site') {
      sortColumn = 'dive_site_id';
    }

    query = query.order(sortColumn, {
      ascending: sortOrder === 'asc',
    });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch feedback');
    }

    // Format response
    const formattedData = data.map((feedback: any) => ({
      id: feedback.id,
      diver_id: feedback.diver_id,
      diver_name: feedback.auth?.user_metadata?.full_name || feedback.auth?.email || 'Unknown',
      dive_site_id: feedback.dive_site_id,
      site_name: feedback.dive_sites?.name || 'Unknown',
      visibility_meters: feedback.visibility_meters,
      temperature_celsius: feedback.temperature_celsius,
      current_strength: feedback.current_strength,
      marine_life: feedback.marine_life || [],
      notes: feedback.notes,
      image_count: feedback.image_urls?.length || 0,
      submitted_at: feedback.submitted_at,
      created_at: feedback.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch feedback',
      },
      { status: 500 }
    );
  }
},
  { maxRequests: 30, windowSeconds: 60 } // 30 requests per minute for admin
);
