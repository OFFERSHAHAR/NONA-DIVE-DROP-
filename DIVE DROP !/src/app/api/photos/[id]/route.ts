import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { deletePhoto, ratePhoto } from '@/lib/photos/upload';

/**
 * DELETE /api/photos/[id]
 * Delete a photo (only the owner can delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete photo
    await deletePhoto(photoId, user.id);

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE /api/photos/[id] error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/[id]
 * Rate a photo or update photo metadata
 *
 * Request body:
 * - action: 'rate' | 'update'
 * - rating (for rate action, 0-5)
 * - caption, description, visibility, tags (for update action)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, rating, caption, description, visibility, tags } = body;

    if (action === 'rate') {
      if (rating === undefined || rating === null) {
        return NextResponse.json(
          { error: 'Rating is required' },
          { status: 400 }
        );
      }

      const result = await ratePhoto(photoId, user.id, rating);

      return NextResponse.json({
        success: true,
        message: 'Photo rated successfully',
        rating: result,
      });
    } else if (action === 'update') {
      // Update photo metadata (only owner can update)
      const updateData: any = {};

      if (caption !== undefined) updateData.caption = caption;
      if (description !== undefined) updateData.description = description;
      if (visibility !== undefined) updateData.visibility = visibility;
      if (tags !== undefined) updateData.tags = tags;

      const { data, error } = await supabase
        .from('user_photos')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Photo not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Photo updated successfully',
        photo: data,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "rate" or "update"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/photos/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
