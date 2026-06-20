import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { approvePhotoSchema } from '@/lib/admin/schemas';
import {
  withAdminAuth,
  successResponse,
  errorResponse,
} from '@/lib/admin/middleware';
import { logUpdate } from '@/lib/admin/audit';
import { logger } from '@/utils/logger';

/**
 * POST /api/admin/photos/approve
 *
 * Approve or reject photos for site rotation
 * Body:
 *   - photo_id: UUID of the photo
 *   - is_approved: boolean
 *   - reason: optional approval reason or rejection reason
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = approvePhotoSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.issues[0].message}`, 400);
    }

    const { photo_id, is_approved, reason } = validation.data;

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

    // Get current photo
    const { data: photo, error: photoError } = await supabase
      .from('site_photos')
      .select('*')
      .eq('id', photo_id)
      .single();

    if (photoError || !photo) {
      return errorResponse('Photo not found', 404);
    }

    const previousState = { is_approved: photo.is_approved };

    // Update photo approval status
    const { data: updated, error: updateError } = await supabase
      .from('site_photos')
      .update({
        is_approved,
        approved_at: is_approved ? new Date().toISOString() : null,
        approved_by: is_approved ? context.userId : null,
      })
      .eq('id', photo_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the action
    await logUpdate('site_photos', photo_id, context.userId, previousState, updated, {
      ip: context.ip,
      userAgent: context.userAgent,
      reason,
    });

    logger.info(`Photo ${photo_id} approval status changed to ${is_approved}`);

    return NextResponse.json(
      successResponse({
        id: updated.id,
        isApproved: updated.is_approved,
        approvedAt: updated.approved_at,
        approvedBy: updated.approved_by,
        message: is_approved ? 'Photo approved for rotation' : 'Photo rejected',
      })
    );
  } catch (error: any) {
    logger.error('POST /api/admin/photos/approve error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * GET /api/admin/photos/approve
 *
 * List pending photos awaiting approval
 * Query params:
 *   - site_id: Filter by site (optional)
 *   - page: Pagination page (default: 1)
 *   - limit: Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const siteId = searchParams.get('site_id');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

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

    let query = supabase
      .from('site_photos')
      .select('id, site_id, title, uploaded_at, user_id, is_approved, rating, comment_count', {
        count: 'exact',
      })
      .eq('is_approved', false); // Only pending photos

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const offset = (page - 1) * limit;
    const { data: photos, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      successResponse({
        photos,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      })
    );
  } catch (error: any) {
    logger.error('GET /api/admin/photos/approve error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
