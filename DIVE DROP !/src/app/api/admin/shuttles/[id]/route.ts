import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { updateShuttleSchema } from '@/lib/admin/schemas';
import {
  withAdminAuth,
  successResponse,
  errorResponse,
} from '@/lib/admin/middleware';
import { logUpdate, logDelete } from '@/lib/admin/audit';
import type { Database } from '@/types/supabase';

/**
 * GET /api/admin/shuttles/[id]
 * Get a single shuttle
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
      .from('shuttles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Shuttle not found', 404);
      }
      throw error;
    }

    return NextResponse.json(successResponse(data));
  } catch (error: any) {
    console.error('GET /api/admin/shuttles/[id] error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * PATCH /api/admin/shuttles/[id]
 * Update a shuttle
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = updateShuttleSchema.safeParse(body);

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
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Shuttle not found', 404);
      }
      throw error;
    }

    await logUpdate('shuttles', id, context.userId, validation.data, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(successResponse(data));
  } catch (error: any) {
    console.error('PATCH /api/admin/shuttles/[id] error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * DELETE /api/admin/shuttles/[id]
 * Delete a shuttle
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

    const { error } = await supabase
      .from('shuttles')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Shuttle not found', 404);
      }
      throw error;
    }

    await logDelete('shuttles', id, context.userId, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error: any) {
    console.error('DELETE /api/admin/shuttles/[id] error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
