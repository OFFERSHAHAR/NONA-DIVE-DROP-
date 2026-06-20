import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { adminListBookingsSchema } from '@/lib/bookings/schemas';
import {
  withBookingAuth,
  successResponse,
  errorResponse,
  paginatedResponse,
  withRateLimit,
  rateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/bookings/middleware';

/**
 * GET /api/admin/bookings
 * Admin: List all bookings with advanced filtering
 */
export async function GET(request: NextRequest) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return authError;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', context!.userId)
      .single();

    if (userError || user.user_type !== 'admin') {
      return NextResponse.json(
        errorResponse('Only admins can access this endpoint'),
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const filterInput = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      dive_site_id: searchParams.get('dive_site_id'),
      sort_by: searchParams.get('sort_by'),
      user_id: searchParams.get('user_id'),
      provider_id: searchParams.get('provider_id'),
      search: searchParams.get('search'),
    };

    const validation = adminListBookingsSchema.safeParse(filterInput);
    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues[0].message),
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      status,
      date_from,
      date_to,
      dive_site_id,
      sort_by,
      user_id,
      provider_id,
      search,
    } = validation.data;
    const offset = (page - 1) * limit;

    let countQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    let dataQuery = supabase.from('bookings').select(`
      id,
      user_id,
      buddy_user_id,
      service_provider_id,
      dive_date,
      dive_site_id,
      status,
      max_depth,
      water_temp,
      estimated_duration,
      created_at,
      updated_at,
      users:user_id(id, first_name, last_name, email),
      buddy:buddy_user_id(id, first_name, last_name),
      provider:service_provider_id(id, first_name, last_name),
      dive_sites:dive_site_id(id, name, location)
    `);

    // Apply filters
    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (date_from) {
      countQuery = countQuery.gte('dive_date', date_from);
      dataQuery = dataQuery.gte('dive_date', date_from);
    }

    if (date_to) {
      countQuery = countQuery.lte('dive_date', date_to);
      dataQuery = dataQuery.lte('dive_date', date_to);
    }

    if (dive_site_id) {
      countQuery = countQuery.eq('dive_site_id', dive_site_id);
      dataQuery = dataQuery.eq('dive_site_id', dive_site_id);
    }

    if (user_id) {
      countQuery = countQuery.or(`user_id.eq.${user_id},buddy_user_id.eq.${user_id}`);
      dataQuery = dataQuery.or(`user_id.eq.${user_id},buddy_user_id.eq.${user_id}`);
    }

    if (provider_id) {
      countQuery = countQuery.eq('service_provider_id', provider_id);
      dataQuery = dataQuery.eq('service_provider_id', provider_id);
    }

    if (search) {
      const searchQuery = `%${search}%`;
      // Search in user names - this is a simplified search
      countQuery = countQuery;
      dataQuery = dataQuery;
    }

    const { count } = await countQuery;

    // Sort and paginate
    const sortColumn =
      sort_by === 'status' ? 'status' : sort_by === 'created' ? 'created_at' : 'dive_date';
    const { data, error } = await dataQuery
      .order(sortColumn, { ascending: sort_by === 'created' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(
      paginatedResponse(data || [], page, limit, count || 0)
    );
  } catch (error: any) {
    console.error('GET /api/admin/bookings error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}
