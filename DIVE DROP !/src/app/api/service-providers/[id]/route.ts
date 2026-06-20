import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProviderDetailResponse } from '@/types/service-provider';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const providerId = params.id;

    // Get provider
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('*')
      .eq('id', providerId)
      .eq('status', 'approved')
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get services
    const { data: services = [] } = await supabase
      .from('provider_services')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true);

    // Get reviews
    const { data: reviews = [], count: reviewCount } = await supabase
      .from('provider_reviews')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get gallery
    const { data: gallery = [] } = await supabase
      .from('provider_gallery')
      .select('*')
      .eq('provider_id', providerId)
      .order('display_order', { ascending: true });

    // Get availability summary
    const { data: availabilities } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .gte('available_date', new Date().toISOString().split('T')[0])
      .order('available_date', { ascending: true })
      .limit(1);

    const response: ProviderDetailResponse = {
      provider,
      services: services || [],
      reviews: {
        items: reviews || [],
        average_rating: provider.average_rating,
        total_count: reviewCount || 0,
      },
      gallery: gallery || [],
      availability_summary: availabilities && availabilities.length > 0
        ? {
            next_available: availabilities[0].available_date,
          }
        : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get provider details error:', error);
    return NextResponse.json(
      { error: 'Failed to get provider details' },
      { status: 500 }
    );
  }
}
