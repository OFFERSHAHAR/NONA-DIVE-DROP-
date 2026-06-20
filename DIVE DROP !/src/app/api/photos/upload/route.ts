import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  uploadPhotoToStorage,
  createPhotoRecord,
  validatePhotoFile,
} from '@/lib/photos/upload';

/**
 * POST /api/photos/upload
 * Upload a photo to a dive site, free diving listing, or instructor profile
 *
 * Request:
 * - multipart/form-data with 'file' field
 * - dive_site_id, free_diving_id, or instructor_id (at least one required)
 * - caption (optional)
 * - description (optional)
 * - visibility (optional, defaults to 'public')
 * - tags (optional, comma-separated)
 */
export async function POST(request: NextRequest) {
  try {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const diveSiteId = formData.get('dive_site_id') as string | null;
    const freeDivingId = formData.get('free_diving_id') as string | null;
    const instructorId = formData.get('instructor_id') as string | null;
    const caption = formData.get('caption') as string | null;
    const description = formData.get('description') as string | null;
    const visibility = formData.get('visibility') as string | null;
    const tagsString = formData.get('tags') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!diveSiteId && !freeDivingId && !instructorId) {
      return NextResponse.json(
        { error: 'At least one of dive_site_id, free_diving_id, or instructor_id is required' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validatePhotoFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Upload to storage
    const uploadResult = await uploadPhotoToStorage(file, user.id);

    // Parse tags
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Create photo record
    const photoRecord = await createPhotoRecord(
      user.id,
      uploadResult.url,
      uploadResult.fileName,
      uploadResult.size,
      uploadResult.type,
      {
        diveSiteId: diveSiteId || undefined,
        freeDivingId: freeDivingId || undefined,
        instructorId: instructorId || undefined,
        caption: caption || undefined,
        description: description || undefined,
        visibility: visibility || 'public',
        tags,
      }
    );

    return NextResponse.json({
      success: true,
      photo: photoRecord,
      url: uploadResult.url,
    });
  } catch (error: any) {
    console.error('POST /api/photos/upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
