import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  blockUserSchema,
  reportUserSchema,
} from '@/lib/buddy/schemas';
import {
  withBuddyAuth,
  successResponse,
  errorResponse,
  withRateLimit,
  rateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/buddy/middleware';
import { logUserBlock, logSafetyReport } from '@/lib/buddy/audit';
import type { Database } from '@/types/supabase';

/**
 * POST /api/buddy/block
 * Block a user (prevent them from seeing your listings, messaging you, etc.)
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withBuddyAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = blockUserSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.issues[0].message}`,
        400
      );
    }

    // Can't block yourself
    if (validation.data.blocked_user_id === context.userId) {
      return errorResponse('You cannot block yourself', 400);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
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

    // Check if already blocked
    const { data: existing } = await supabase
      .from('buddy_blocks')
      .select('id')
      .eq('user_id', context.userId)
      .eq('blocked_user_id', validation.data.blocked_user_id)
      .single();

    if (existing) {
      return errorResponse('This user is already blocked', 409);
    }

    // Create block
    const { data, error } = await supabase
      .from('buddy_blocks')
      .insert([
        {
          user_id: context.userId,
          blocked_user_id: validation.data.blocked_user_id,
          reason: validation.data.reason,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logUserBlock(
      context.userId,
      validation.data.blocked_user_id,
      validation.data.reason,
      context.ip,
      context.userAgent
    );

    return NextResponse.json(successResponse(data), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/buddy/block error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * POST /api/buddy/report
 * Report a user for safety/abuse violations
 * Rate limited to 5 reports per hour
 */
export async function POST_REPORT(request: NextRequest) {
  const { data: context, error: authError } = await withBuddyAuth(request);
  if (authError) return authError;

  // Strict rate limiting for reports
  const rateLimiter = withRateLimit(rateLimitConfigs.reports);
  const limitCheck = rateLimiter(`report:${context.userId}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const body = await request.json();
    const validation = reportUserSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.issues[0].message}`,
        400
      );
    }

    // Can't report yourself
    if (validation.data.reported_user_id === context.userId) {
      return errorResponse('You cannot report yourself', 400);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
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

    // Create report
    const { data, error } = await supabase
      .from('buddy_reports')
      .insert([
        {
          reporter_id: context.userId,
          reported_user_id: validation.data.reported_user_id,
          reason: validation.data.reason,
          description: validation.data.description,
          attachment_url: validation.data.attachment_url,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logSafetyReport(
      context.userId,
      validation.data.reported_user_id,
      validation.data.reason,
      validation.data.description,
      context.ip,
      context.userAgent
    );

    return NextResponse.json(
      successResponse({
        id: data.id,
        message: 'Report submitted. Our team will review this shortly.',
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/buddy/report error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * GET /api/buddy/blocks
 * Get list of users I've blocked
 */
export async function GET(request: NextRequest) {
  const { data: context, error: authError } = await withBuddyAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    if (page < 1 || limit < 1 || limit > 100) {
      return errorResponse('Invalid pagination parameters', 400);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
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

    const offset = (page - 1) * limit;

    // Get count
    const { count } = await supabase
      .from('buddy_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', context.userId);

    // Get paginated data
    const { data, error } = await supabase
      .from('buddy_blocks')
      .select(`
        id,
        blocked_user_id,
        reason,
        created_at,
        blocked_user:blocked_user_id(
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(successResponse({
      blocks: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }));
  } catch (error: any) {
    console.error('GET /api/buddy/blocks error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * DELETE /api/buddy/blocks/:user_id
 * Unblock a user
 */
export async function DELETE(request: NextRequest) {
  const { data: context, error: authError } = await withBuddyAuth(request);
  if (authError) return authError;
  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) return errorResponse('user_id query parameter required', 400);

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
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

    // Delete block
    const { error } = await supabase
      .from('buddy_blocks')
      .delete()
      .eq('user_id', context.userId)
      .eq('blocked_user_id', userId);

    if (error) throw error;

    return NextResponse.json(successResponse({ unblocked: true }));
  } catch (error: any) {
    console.error('DELETE /api/buddy/blocks/:user_id error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
