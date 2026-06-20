import type {
  ServiceProvider,
  ProviderService,
  ProviderReview,
  ProviderBooking,
  ProviderDetailResponse,
  SearchProvidersResponse,
  ProviderFilters,
} from '@/types/service-provider';

class ServiceProviderClient {
  private baseUrl = '/api/service-providers';

  /**
   * Search providers with filters
   */
  async searchProviders(
    filters: Partial<ProviderFilters>
  ): Promise<SearchProvidersResponse> {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.provider_type) params.append('provider_type', filters.provider_type);
    if (filters.service_category) params.append('service_category', filters.service_category);
    if (filters.location) params.append('location', filters.location);
    if (filters.latitude !== undefined) params.append('latitude', String(filters.latitude));
    if (filters.longitude !== undefined) params.append('longitude', String(filters.longitude));
    if (filters.radius_km) params.append('radius_km', String(filters.radius_km));
    if (filters.min_rating) params.append('min_rating', String(filters.min_rating));
    if (filters.price_min) params.append('price_min', String(filters.price_min));
    if (filters.price_max) params.append('price_max', String(filters.price_max));
    if (filters.is_verified !== undefined) params.append('is_verified', String(filters.is_verified));
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await fetch(`${this.baseUrl}/search?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to search providers');
    return response.json();
  }

  /**
   * Get provider details
   */
  async getProviderDetails(providerId: string): Promise<ProviderDetailResponse> {
    const response = await fetch(`${this.baseUrl}/${providerId}`);
    if (!response.ok) throw new Error('Failed to get provider details');
    return response.json();
  }

  /**
   * Get single provider
   */
  async getProvider(providerId: string): Promise<ServiceProvider> {
    const response = await fetch(`${this.baseUrl}/${providerId}`);
    if (!response.ok) throw new Error('Failed to get provider');
    const data = await response.json();
    return data.provider;
  }

  /**
   * Get provider services
   */
  async getProviderServices(providerId: string): Promise<ProviderService[]> {
    const response = await fetch(`${this.baseUrl}/${providerId}/services`);
    if (!response.ok) throw new Error('Failed to get services');
    const data = await response.json();
    return data.services;
  }

  /**
   * Get provider reviews
   */
  async getProviderReviews(
    providerId: string,
    page = 1,
    limit = 10
  ): Promise<{ items: ProviderReview[]; total: number; average_rating: number }> {
    const response = await fetch(
      `${this.baseUrl}/${providerId}/reviews?page=${page}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to get reviews');
    return response.json();
  }

  /**
   * Submit review
   */
  async submitReview(
    providerId: string,
    data: {
      rating: number;
      title?: string;
      comment: string;
      safety_rating?: number;
      professionalism_rating?: number;
      value_rating?: number;
    }
  ): Promise<ProviderReview> {
    const response = await fetch(`${this.baseUrl}/${providerId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit review');
    return response.json();
  }

  /**
   * Create booking
   */
  async createBooking(serviceId: string, data: {
    booking_date: string;
    start_time: string;
    group_size: number;
    special_requests?: string;
  }): Promise<ProviderBooking> {
    const response = await fetch(`${this.baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: serviceId, ...data }),
    });
    if (!response.ok) throw new Error('Failed to create booking');
    return response.json();
  }

  /**
   * Get provider gallery
   */
  async getProviderGallery(providerId: string) {
    const response = await fetch(`${this.baseUrl}/${providerId}/gallery`);
    if (!response.ok) throw new Error('Failed to get gallery');
    const data = await response.json();
    return data.gallery || [];
  }
}

export const serviceProviderClient = new ServiceProviderClient();
