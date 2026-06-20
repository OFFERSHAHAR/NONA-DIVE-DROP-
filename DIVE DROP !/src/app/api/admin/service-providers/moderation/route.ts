import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (this is a simplified check - implement proper admin role)
    // In production, check user roles/permissions in your auth system
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminUser?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get providers by status
    const status = request.nextUrl.searchParams.get('status') || 'pending';

    const { data: providers, error } = await supabase
      .from('service_providers')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ providers: providers || [] });
  } catch (error) {
    console.error('Get moderation queue error:', error);
    return NextResponse.json(
      { error: 'Failed to get moderation queue' },
      { status: 500 }
    );
  }
}
