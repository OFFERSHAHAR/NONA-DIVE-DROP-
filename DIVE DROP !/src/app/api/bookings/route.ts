import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  createBookingSchema,
  listBookingsFilterSchema,
} from '@/lib/bookings/schemas';
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
 * GET /api/bookings
 * List user's bookings with filtering
 */
export async function GET(request: NextRequest) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const filterInput = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      dive_site_id: searchParams.get('dive_site_id'),
      sort_by: searchParams.get('sort_by'),
    };

    const validation = listBookingsFilterSchema.safeParse(filterInput);
    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues[0].message),
        { status: 400 }
      );
    }

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

    const { page, limit, status, date_from, date_to, dive_site_id, sort_by } =
      validation.data;
    const offset = (page - 1) * limit;

    // Build query
    let countQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${context!.userId},buddy_user_id.eq.${context!.userId}`);

    let dataQuery = supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        buddy_user_id,
        dive_date,
        dive_site_id,
        status,
        max_depth,
        water_temp,
        estimated_duration,
        created_at,
        users:user_id(id, first_name, last_name, avatar_url),
        buddy:buddy_user_id(id, first_name, last_name, avatar_url),
        dive_sites:dive_site_id(id, name, location)
      `)
      .or(`user_id.eq.${context!.userId},buddy_user_id.eq.${context!.userId}`);

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

    const { count } = await countQuery;

    // Sort and paginate
    const sortColumn = sort_by === 'status' ? 'status' : sort_by === 'created' ? 'created_at' : 'dive_date';
    const { data, error } = await dataQuery
      .order(sortColumn, { ascending: sort_by === 'created' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(
      paginatedResponse(data || [], page, limit, count || 0)
    );
  } catch (error: any) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Create a new booking
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withBookingAuth(request);
  if (authError) return authError;

  const rateLimiter = withRateLimit(rateLimitConfigs.bookings);
  const limitCheck = rateLimiter(`bookings:create:${context!.userId}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const body = await request.json();
    const validation = createBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues[0].message),
        { status: 400 }
      );
    }

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

    // Prevent self-booking
    if (validation.data.buddy_user_id === context!.userId) {
      return NextResponse.json(
        errorResponse('Cannot book with yourself'),
        { status: 400 }
      );
    }

    // Create booking
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          ...validation.data,
          user_id: context!.userId,
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(successResponse(data), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Internal server error'),
      { status: 500 }
    );
  }
}
