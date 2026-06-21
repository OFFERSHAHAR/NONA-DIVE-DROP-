import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Fetch feedback details with related data
    const { data: feedback, error } = await supabase
      .from('feedback')
      .select(
        `
        id,
        diver_id,
        dive_site_id,
        dive_booking_id,
        visibility_meters,
        temperature_celsius,
        current_strength,
        marine_life,
        marine_life_custom,
        notes,
        image_urls,
        submitted_at,
        created_at,
        updated_at,
        auth.users!diver_id(email, user_metadata),
        dive_sites!dive_site_id(name)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch feedback');
    }

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Format response
    const formattedData = {
      id: feedback.id,
      diver_id: feedback.diver_id,
      diver_name: feedback.auth?.user_metadata?.full_name || feedback.auth?.email || 'Unknown',
      diver_email: feedback.auth?.email,
      dive_site_id: feedback.dive_site_id,
      site_name: feedback.dive_sites?.name || 'Unknown',
      dive_booking_id: feedback.dive_booking_id,
      visibility_meters: feedback.visibility_meters,
      temperature_celsius: feedback.temperature_celsius,
      current_strength: feedback.current_strength,
      marine_life: feedback.marine_life || [],
      marine_life_custom: feedback.marine_life_custom,
      notes: feedback.notes,
      image_urls: feedback.image_urls || [],
      submitted_at: feedback.submitted_at,
      created_at: feedback.created_at,
      updated_at: feedback.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('Feedback detail fetch error:', error);
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
}
