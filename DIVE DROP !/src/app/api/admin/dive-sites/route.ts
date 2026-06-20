import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createDiveSiteSchema, paginationSchema } from '@/lib/admin/schemas';
import {
  withAdminAuth,
  successResponse,
  errorResponse,
  paginatedResponse,
} from '@/lib/admin/middleware';
import { logCreate, logImport } from '@/lib/admin/audit';
import { uploadDiveSiteImage, deleteFile } from '@/lib/admin/file-upload';
import type { Database } from '@/types/supabase';

/**
 * GET /api/admin/dive-sites
 * List all dive sites with pagination
 * Query: page, limit, sortBy, sortOrder
 */
export async function GET(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const validation = paginationSchema.safeParse({ page, limit });
    if (!validation.success) {
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

    const { count } = await supabase
      .from('dive_sites')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('dive_sites')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      paginatedResponse(data || [], page, limit, count || 0)
    );
  } catch (error: any) {
    console.error('GET /api/admin/dive-sites error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * POST /api/admin/dive-sites
 * Create a single dive site
 * Supports file upload via multipart/form-data with 'image' field
 */
export async function POST(request: NextRequest) {
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

    const siteData = { ...body, image_url: imageUrl || body.image_url };
    const validation = createDiveSiteSchema.safeParse(siteData);

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
      .insert([validation.data])
      .select()
      .single();

    if (error) throw error;

    await logCreate('dive_sites', data.id, context.userId, validation.data, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(successResponse(data), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/dive-sites error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * PUT /api/admin/dive-sites/bulk-import
 * Bulk import dive sites from JSON
 */
export async function PUT(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { sites, skipDuplicates = true } = body;

    if (!Array.isArray(sites) || sites.length === 0) {
      return errorResponse('Sites array required', 400);
    }

    if (sites.length > 500) {
      return errorResponse('Maximum 500 sites per import', 400);
    }

    const validations = sites.map(s => createDiveSiteSchema.safeParse(s));
    const failedValidations = validations.filter(v => !v.success);

    if (failedValidations.length > 0) {
      return errorResponse(
        `Validation errors in ${failedValidations.length} records`,
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

    const validSites = validations
      .map((v, i) => (v.success ? (v.data as any) : null))
      .filter(Boolean) as any[];

    const { data, error } = await supabase
      .from('dive_sites')
      .insert(validSites)
      .select();

    if (error) throw error;

    await logImport('dive_sites', context.userId, { count: data?.length || 0 }, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(
      successResponse({ imported: data?.length || 0, total: sites.length })
    );
  } catch (error: any) {
    console.error('PUT /api/admin/dive-sites error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
