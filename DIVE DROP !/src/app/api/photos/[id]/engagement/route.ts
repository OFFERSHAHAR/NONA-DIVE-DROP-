import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const engagementSchema = z.object({
  event_type: z.enum(['view', 'like', 'unlike', 'share']),
});

type EngagementInput = z.infer<typeof engagementSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Parse request
    const body = await request.json();
    const data = engagementSchema.parse(body);

    // Get IP address and user agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || '';

    // Get auth header (optional)
    const authHeader = request.headers.get('Authorization') || '';
    let userId: string | null = null;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    // Create client for tracking
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Check if photo exists
    const { data: photo, error: photoError } = await supabase
      .from('user_photos')
      .select('id')
      .eq('id', params.id)
      .single();

    if (photoError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Track engagement
    const { data: engagement, error: engagementError } = await supabase
      .from('photo_engagement_tracking')
      .insert({
        photo_id: params.id,
        user_id: userId,
        event_type: data.event_type,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (engagementError) {
      console.error('Engagement tracking error:', engagementError);
      return NextResponse.json(
        { error: 'Failed to track engagement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      engagement,
      message: `${data.event_type} tracked`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid engagement data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Engagement error:', error);
    return NextResponse.json(
      { error: 'Failed to track engagement' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Get engagement counts
    const { data: engagement, error: engagementError } = await supabase
      .from('photo_engagement_tracking')
      .select('event_type')
      .eq('photo_id', params.id);

    if (engagementError) {
      console.error('Fetch engagement error:', engagementError);
      return NextResponse.json(
        { error: 'Failed to fetch engagement' },
        { status: 500 }
      );
    }

    // Count by event type
    const counts = {
      views: 0,
      likes: 0,
      unlikes: 0,
      shares: 0,
    };

    engagement?.forEach((e) => {
      switch (e.event_type) {
        case 'view':
          counts.views++;
          break;
        case 'like':
          counts.likes++;
          break;
        case 'unlike':
          counts.unlikes++;
          break;
        case 'share':
          counts.shares++;
          break;
      }
    });

    return NextResponse.json({
      photo_id: params.id,
      view_count: counts.views,
      like_count: Math.max(0, counts.likes - counts.unlikes),
      share_count: counts.shares,
    });
  } catch (error) {
    console.error('Get engagement error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement' },
      { status: 500 }
    );
  }
}
