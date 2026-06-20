import { NextRequest, NextResponse } from 'next/server';
import { getPhotosForFreeDiving } from '@/lib/photos/upload';

/**
 * GET /api/photos/free-diving/[id]
 * Get photos for a specific free diving listing
 *
 * Query params:
 * - limit (default: 12)
 * - offset (default: 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: freeDivingId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '12'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const { photos, total } = await getPhotosForFreeDiving(
      freeDivingId,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      photos,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error: any) {
    console.error(`GET /api/photos/free-diving/[id] error:`, error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
