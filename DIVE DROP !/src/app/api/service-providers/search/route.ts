import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchProvidersSchema } from '@/lib/service-provider/schemas';
import type { SearchProvidersResponse } from '@/types/service-provider';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      search: searchParams.get('search') || undefined,
      provider_type: searchParams.get('provider_type') || undefined,
      service_category: searchParams.get('service_category') || undefined,
      location: searchParams.get('location') || undefined,
      latitude: searchParams.get('latitude') ? parseFloat(searchParams.get('latitude')!) : undefined,
      longitude: searchParams.get('longitude') ? parseFloat(searchParams.get('longitude')!) : undefined,
      radius_km: searchParams.get('radius_km') ? parseInt(searchParams.get('radius_km')!) : 50,
      min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : 0,
      price_min: searchParams.get('price_min') ? parseFloat(searchParams.get('price_min')!) : 0,
      price_max: searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : 100000,
      is_verified: searchParams.get('is_verified') ? searchParams.get('is_verified') === 'true' : undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'rating',
    };

    // Validate filters
    const validatedFilters = searchProvidersSchema.parse(filters);

    // Build query
    let query = supabase
      .from('service_providers')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    // Apply search filter
    if (validatedFilters.search) {
      query = query.or(
        `business_name.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`
      );
    }

    // Apply provider type filter
    if (validatedFilters.provider_type) {
      query = query.eq('provider_type', validatedFilters.provider_type);
    }

    // Apply location filter
    if (validatedFilters.location) {
      query = query.ilike('primary_location', `%${validatedFilters.location}%`);
    }

    // Apply rating filter
    if (validatedFilters.min_rating > 0) {
      query = query.gte('average_rating', validatedFilters.min_rating);
    }

    // Apply verified filter
    if (validatedFilters.is_verified !== undefined) {
      query = query.eq('is_verified', validatedFilters.is_verified);
    }

    // Apply sorting
    switch (validatedFilters.sort_by) {
      case 'rating':
        query = query.order('average_rating', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'distance':
        // Distance sorting requires lat/long
        if (validatedFilters.latitude && validatedFilters.longitude) {
          // Note: Supabase doesn't have built-in distance sorting
          // We'll sort by created_at as fallback
          query = query.order('created_at', { ascending: false });
        }
        break;
      default:
        query = query.order('average_rating', { ascending: false });
    }

    // Pagination
    const offset = (validatedFilters.page - 1) * validatedFilters.limit;
    query = query.range(offset, offset + validatedFilters.limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    // Filter by price and distance in application (Supabase limitations)
    let filtered = data || [];

    // Filter by price (check if provider has services in price range)
    if (validatedFilters.price_min > 0 || validatedFilters.price_max < 100000) {
      const providerIds = filtered.map((p) => p.id);
      if (providerIds.length > 0) {
        const { data: services } = await supabase
          .from('provider_services')
          .select('provider_id')
          .in('provider_id', providerIds)
          .gte('price_shekel', validatedFilters.price_min)
          .lte('price_shekel', validatedFilters.price_max);

        if (services) {
          const validProviderIds = new Set(services.map((s) => s.provider_id));
          filtered = filtered.filter((p) => validProviderIds.has(p.id));
        }
      }
    }

    // Filter by distance (Haversine formula)
    if (validatedFilters.latitude && validatedFilters.longitude) {
      filtered = filtered.filter((provider) => {
        if (!provider.latitude || !provider.longitude) return false;

        const lat1 = validatedFilters.latitude!;
        const lon1 = validatedFilters.longitude!;
        const lat2 = provider.latitude;
        const lon2 = provider.longitude;

        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= validatedFilters.radius_km;
      });
    }

    const response: SearchProvidersResponse = {
      providers: filtered,
      total: count || 0,
      page: validatedFilters.page,
      limit: validatedFilters.limit,
      has_more: offset + validatedFilters.limit < (count || 0),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Search providers error:', error);
    return NextResponse.json(
      { error: 'Failed to search providers' },
      { status: 500 }
    );
  }
}
