/**
 * GET /api/training
 * List all active training programs with optional filtering
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { TrainingFilterOptions } from '@/types/training';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const depth_level = searchParams.get('depth_level');
    const location = searchParams.get('location');
    const max_price = searchParams.get('max_price');
    const min_price = searchParams.get('min_price');
    const instructor_rating = searchParams.get('instructor_rating');
    const sort_by = searchParams.get('sort_by') || 'relevance';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('training_programs')
      .select(
        `*,
        freediving_instructors!inner(
          id,
          user_id,
          average_rating,
          total_reviews,
          total_sessions_completed,
          years_experience
        )`
      )
      .eq('is_active', true)
      .eq('status', 'active');

    // Apply filters
    if (depth_level) {
      query = query.eq('depth_level', depth_level);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (min_price) {
      query = query.gte('price_shekel', parseFloat(min_price));
    }

    if (max_price) {
      query = query.lte('price_shekel', parseFloat(max_price));
    }

    if (instructor_rating) {
      query = query.gte('freediving_instructors.average_rating', parseFloat(instructor_rating));
    }

    // Apply sorting
    switch (sort_by) {
      case 'price':
        query = query.order('price_shekel', { ascending: true });
        break;
      case 'rating':
        query = query.order('average_rating', { ascending: false });
        break;
      case 'date':
        query = query.order('next_start_date', { ascending: true });
        break;
      case 'relevance':
      default:
        query = query.order('average_rating', { ascending: false });
        query = query.order('total_students_trained', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching training programs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch training programs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/training
 * Create a new training program (instructor only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an instructor
    const { data: instructor, error: instructorError } = await supabase
      .from('freediving_instructors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!instructor || instructorError) {
      return NextResponse.json(
        { success: false, error: 'User is not an instructor' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    const {
      name,
      description,
      depth_level,
      depth_min_meters,
      depth_max_meters,
      duration_hours,
      duration_days,
      max_students,
      price_shekel,
      location,
      latitude,
      longitude,
      next_start_date,
      session_days,
      min_age,
      min_experience_level,
      medical_clearance_required,
      equipment_provided,
      topics,
      certifications_offered,
      equipment_provided_list,
    } = body;

    // Validate required fields
    if (
      !name ||
      !description ||
      !depth_level ||
      !depth_min_meters ||
      !depth_max_meters ||
      !duration_hours ||
      !duration_days ||
      !price_shekel ||
      !location
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create training program
    const { data, error } = await supabase
      .from('training_programs')
      .insert({
        instructor_id: instructor.id,
        name,
        description,
        depth_level,
        depth_min_meters,
        depth_max_meters,
        duration_hours,
        duration_days,
        max_students,
        price_shekel,
        location,
        latitude,
        longitude,
        next_start_date,
        session_days: session_days || 1,
        min_age: min_age || 16,
        min_experience_level: min_experience_level || 'recreational',
        medical_clearance_required: medical_clearance_required !== false,
        equipment_provided: equipment_provided || false,
        topics: topics || [],
        certifications_offered: certifications_offered || [],
        equipment_provided_list: equipment_provided_list || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data, message: 'Training program created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating training program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create training program' },
      { status: 500 }
    );
  }
}
