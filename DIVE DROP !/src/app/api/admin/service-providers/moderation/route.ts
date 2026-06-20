import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // CRITICAL SECURITY: Verify admin authorization before accessing data
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

    // TODO: Implement service provider moderation when service_providers table is properly defined
    // For now, return mock data

    return NextResponse.json({ providers: [] });
  } catch (error) {
    console.error('Get moderation queue error:', error);
    return NextResponse.json(
      { error: 'Failed to get moderation queue' },
      { status: 500 }
    );
  }
}
