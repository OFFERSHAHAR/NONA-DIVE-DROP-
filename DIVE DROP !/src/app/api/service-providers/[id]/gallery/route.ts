import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const providerId = params.id;

    const { data: gallery, error } = await supabase
      .from('provider_gallery')
      .select('*')
      .eq('provider_id', providerId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ gallery: gallery || [] });
  } catch (error) {
    console.error('Get gallery error:', error);
    return NextResponse.json(
      { error: 'Failed to get gallery' },
      { status: 500 }
    );
  }
}
