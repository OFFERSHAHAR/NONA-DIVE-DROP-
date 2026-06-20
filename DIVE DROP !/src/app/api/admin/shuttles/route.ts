import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createShuttleSchema, paginationSchema } from '@/lib/admin/schemas';
import {
  withAdminAuth,
  successResponse,
  errorResponse,
  paginatedResponse,
} from '@/lib/admin/middleware';
import { logCreate } from '@/lib/admin/audit';
import type { Database } from '@/types/supabase';

/**
 * GET /api/admin/shuttles
 * List all shuttles with pagination
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
      .from('shuttles')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('shuttles')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      paginatedResponse(data || [], page, limit, count || 0)
    );
  } catch (error: any) {
    console.error('GET /api/admin/shuttles error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * POST /api/admin/shuttles
 * Create a single shuttle
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = createShuttleSchema.safeParse(body);

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
      .from('shuttles')
      .insert([validation.data])
      .select()
      .single();

    if (error) throw error;

    await logCreate('shuttles', data.id, context.userId, validation.data, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(successResponse(data), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/shuttles error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
