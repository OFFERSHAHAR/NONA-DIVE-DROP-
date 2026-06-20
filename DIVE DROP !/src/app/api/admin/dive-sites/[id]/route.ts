import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { updateDiveSiteSchema } from '@/lib/admin/schemas';
import {
  withAdminAuth,
  successResponse,
  errorResponse,
} from '@/lib/admin/middleware';
import { logUpdate, logDelete } from '@/lib/admin/audit';
import { uploadDiveSiteImage, deleteFile } from '@/lib/admin/file-upload';
import type { Database } from '@/types/supabase';

/**
 * GET /api/admin/dive-sites/[id]
 * Get a single dive site
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

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

    const { data, error } = await supabase
      .from('dive_sites')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Dive site not found', 404);
      }
      throw error;
    }

    return NextResponse.json(successResponse(data));
  } catch (error: any) {
    console.error('GET /api/admin/dive-sites/[id] error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * PATCH /api/admin/dive-sites/[id]
 * Update a dive site
 * Supports file upload via multipart/form-data with 'image' field
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    let body: any;
    let imageUrl: string | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const image = formData.get('image') as File | null;

      body = Object.fromEntries(
        Array.from(formData.entries()).filter(([k]) => k !== 'image')
      );

      if (image && image.size > 0) {
        try {
          const uploadResult = await uploadDiveSiteImage(image, image.name);
          imageUrl = uploadResult.url;
        } catch (error: any) {
          return errorResponse(`Image upload failed: ${error.message}`, 400);
        }
      }
    } else {
      body = await request.json();
    }

    const updateData = { ...body, ...(imageUrl && { image_url: imageUrl }) };
    const validation = updateDiveSiteSchema.safeParse(updateData);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.issues[0].message}`,
        400
      );
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

    const { data, error } = await supabase
      .from('dive_sites')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Dive site not found', 404);
      }
      throw error;
    }

    await logUpdate('dive_sites', id, context.userId, validation.data, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(successResponse(data));
  } catch (error: any) {
    console.error('PATCH /api/admin/dive-sites/[id] error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * DELETE /api/admin/dive-sites/[id]
 * Delete a dive site and associated image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

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

    // Get site to retrieve image URL for cleanup
    const { data: site } = await supabase
      .from('dive_sites')
      .select('image_url')
      .eq('id', id)
      .single();

    // Delete image if exists
    if (site?.image_url) {
      try {
        const filename = site.image_url.split('/').pop();
        if (filename) {
          await deleteFile(filename);
        }
      } catch {
        // Ignore image deletion errors
      }
    }

    const { error } = await supabase
      .from('dive_sites')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Dive site not found', 404);
      }
      throw error;
    }

    await logDelete('dive_sites', id, context.userId, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error: any) {
    console.error('DELETE /api/admin/dive-sites/[id] error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
