import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createFreeDivingListingSchema, freeDivingFiltersSchema } from '@/lib/validations/free-diving';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET: Fetch free diving listings with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate filters
    const filters = {
      listing_type: searchParams.get('listing_type') || undefined,
      instructor_type: searchParams.get('instructor_type') || undefined,
      location: searchParams.get('location') || undefined,
      experience_level: searchParams.get('experience_level') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
    };

    const validatedFilters = freeDivingFiltersSchema.parse(filters);
    const offset = (validatedFilters.page - 1) * validatedFilters.limit;

    let query = supabase
      .from('free_diving_listings')
      .select(
        `
        *,
        user:users(id, email, user_metadata),
        profile:profiles(avatar_url, experience_level, total_dives_logged),
        free_diving_interests(id)
        `,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (validatedFilters.listing_type) {
      query = query.eq('listing_type', validatedFilters.listing_type);
    }
    if (validatedFilters.instructor_type) {
      query = query.eq('instructor_type', validatedFilters.instructor_type);
    }
    if (validatedFilters.location) {
      query = query.ilike('location', `%${validatedFilters.location}%`);
    }
    if (validatedFilters.experience_level) {
      query = query.eq('experience_level', validatedFilters.experience_level);
    }
    if (validatedFilters.start_date) {
      query = query.gte('start_date', validatedFilters.start_date);
    }
    if (validatedFilters.end_date) {
      query = query.lte('end_date', validatedFilters.end_date);
    }

    // Apply pagination
    const { data, error, count } = await query.range(offset, offset + validatedFilters.limit - 1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page: validatedFilters.page,
        limit: validatedFilters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / validatedFilters.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new free diving listing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createFreeDivingListingSchema.parse(body);

    const { data, error } = await supabase.from('free_diving_listings').insert({
      user_id: user.id,
      ...validatedData,
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
