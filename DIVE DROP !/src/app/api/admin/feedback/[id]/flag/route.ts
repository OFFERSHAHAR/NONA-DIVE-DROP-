import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { withRateLimit } from '@/lib/security/rate-limiter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check rate limit first
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
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

    const flagSchema = z.object({
      reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
    });

    let body;
    try {
      body = await request.json();
      flagSchema.parse(body);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const reason = body.reason || 'Flagged by admin';

    // Update feedback status to flagged with reason
    const { data, error } = await supabase
      .from('feedback')
      .update({
        status: 'flagged',
        flag_reason: reason,
        flagged_at: new Date().toISOString(),
        flagged_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to flag feedback');
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback flagged successfully',
      data,
    });
  } catch (error) {
    console.error('Feedback flag error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to flag feedback',
      },
      { status: 500 }
    );
  }
}
