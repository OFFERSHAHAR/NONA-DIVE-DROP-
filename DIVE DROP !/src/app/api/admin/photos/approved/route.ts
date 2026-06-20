import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // CRITICAL SECURITY: Verify admin authorization before accessing data
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Verify against admin_users table (not user_metadata which can be spoofed)
    // @ts-ignore - admin_users table exists but not in generated types
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // TODO: Implement photo approval listing when photos table is available
    // For now, return mock data to allow the app to build
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    return NextResponse.json({
      photos: [],
      total: 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get approved photos error:', error);
    return NextResponse.json(
      { error: 'Failed to get approved photos' },
      { status: 500 }
    );
  }
}
