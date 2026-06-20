import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createUserSchema, paginationSchema } from '@/lib/admin/schemas';
import {
  withAdminAuth,
  successResponse,
  errorResponse,
  paginatedResponse,
} from '@/lib/admin/middleware';
import { logCreate, logImport } from '@/lib/admin/audit';
import type { Database } from '@/types/supabase';

/**
 * GET /api/admin/users
 * List all users with pagination
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

    // Get total count
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get paginated data
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      paginatedResponse(data || [], page, limit, count || 0)
    );
  } catch (error: any) {
    console.error('GET /api/admin/users error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * POST /api/admin/users
 * Create a single user
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

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
      .from('users')
      .insert([validation.data])
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logCreate('users', data.id, context.userId, validation.data, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(successResponse(data), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/users error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * POST /api/admin/users/bulk-import
 * Import multiple users from JSON
 * Body: { users: array, skipDuplicates?: boolean }
 */
export async function PUT(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { users, skipDuplicates = true } = body;

    if (!Array.isArray(users) || users.length === 0) {
      return errorResponse('Users array required', 400);
    }

    if (users.length > 1000) {
      return errorResponse('Maximum 1000 users per import', 400);
    }

    // Validate each user
    const validations = users.map(u => createUserSchema.safeParse(u));
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

    const validUsers = validations
      .map((v, i) => (v.success ? (v.data as any) : null))
      .filter(Boolean) as any[];

    const { data, error } = await supabase
      .from('users')
      .insert(validUsers)
      .select();

    if (error) throw error;

    // Audit log
    await logImport('users', context.userId, { count: data?.length || 0 }, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(
      successResponse({ imported: data?.length || 0, total: users.length })
    );
  } catch (error: any) {
    console.error('PUT /api/admin/users error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
