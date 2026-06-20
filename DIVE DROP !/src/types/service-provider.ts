// Service Provider Directory Types

export interface ServiceProvider {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  phone: string;
  email: string;
  website_url?: string;
  avatar_url?: string;
  cover_image_url?: string;
  provider_type: 'instructor' | 'shop' | 'guide' | 'boat_operator' | 'rental' | 'photography';
  license_number?: string;
  license_expiry?: string;
  insurance_provider?: string;
  insurance_expiry?: string;
  years_experience?: number;
  certifications?: string[];
  primary_location: string;
  latitude?: number;
  longitude?: number;
  service_radius_km: number;
  average_rating: number;
  total_reviews: number;
  response_rate?: number;
  status: 'pending' | 'approved' | 'suspended' | 'archived';
  is_verified: boolean;
  verification_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  name: string;
  description: string;
  service_category: 'training' | 'guiding' | 'equipment' | 'boat' | 'photography' | 'transport';
  price_shekel: number;
  currency: string;
  duration_minutes?: number;
  group_size_min: number;
  group_size_max: number;
  available_mon: boolean;
  available_tue: boolean;
  available_wed: boolean;
  available_thu: boolean;
  available_fri: boolean;
  available_sat: boolean;
  available_sun: boolean;
  start_hour?: string;
  end_hour?: string;
  min_experience_level?: 'beginner' | 'intermediate' | 'advanced';
  certification_required?: string;
  is_active: boolean;
  booking_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderReview {
  id: string;
  provider_id: string;
  reviewer_user_id: string;
  booking_id?: string;
  rating: number;
  title?: string;
  comment: string;
  safety_rating?: number;
  professionalism_rating?: number;
  value_rating?: number;
  is_verified_booking: boolean;
  is_helpful_count: number;
  is_reported: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ProviderBooking {
  id: string;
  service_id: string;
  booker_user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  group_size: number;
  special_requests?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  confirmation_code: string;
  total_price_shekel?: number;
  provider_notes?: string;
  customer_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderGalleryItem {
  id: string;
  provider_id: string;
  url: string;
  media_type: 'image' | 'video';
  title?: string;
  description?: string;
  display_order?: number;
  is_featured: boolean;
  created_at: string;
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  max_bookings: number;
  current_bookings: number;
  is_blocked: boolean;
  block_reason?: string;
  created_at: string;
}

export interface ProviderModerationLog {
  id: string;
  provider_id: string;
  action: string;
  reason?: string;
  admin_user_id?: string;
  created_at: string;
}

// Response Types

export interface SearchProvidersResponse {
  providers: ServiceProvider[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ProviderDetailResponse {
  provider: ServiceProvider;
  services: ProviderService[];
  reviews: {
    items: ProviderReview[];
    average_rating: number;
    total_count: number;
  };
  gallery: ProviderGalleryItem[];
  availability_summary?: {
    next_available?: string;
    response_time_hours?: number;
  };
}

export interface BookingResponse {
  booking: ProviderBooking;
  confirmation_url?: string;
  estimated_confirmation_time?: string;
}

export interface ProviderStatsResponse {
  total_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  total_reviews: number;
  average_rating: number;
  response_rate: number;
  revenue_total?: number;
  revenue_this_month?: number;
}

// UI Component Props

export interface ProviderCardProps {
  provider: ServiceProvider;
  services?: ProviderService[];
  onViewDetails?: () => void;
  showDistance?: boolean;
  distance?: number;
}

export interface BookingFormProps {
  service: ProviderService;
  provider: ServiceProvider;
  onSubmit?: (booking: any) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export interface ReviewFormProps {
  providerId: string;
  onSubmit?: (review: any) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export interface DirectorySearchProps {
  onSearch?: (filters: any) => void;
  isLoading?: boolean;
  defaultFilters?: Partial<any>;
}

export interface ProviderDashboardStats {
  total_bookings: number;
  pending_bookings: number;
  total_reviews: number;
  average_rating: number;
  response_rate: number;
  revenue_this_month?: number;
}

// Filter Types

export interface ProviderFilters {
  page?: number;
  limit?: number;
  search?: string;
  provider_type?: string;
  service_category?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  min_rating?: number;
  price_min?: number;
  price_max?: number;
  is_verified?: boolean;
  sort_by?: 'rating' | 'price_asc' | 'price_desc' | 'distance' | 'newest';
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  min_rating?: number;
  max_rating?: number;
  sort_by?: 'newest' | 'helpful' | 'rating_high' | 'rating_low';
}

export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  date_from?: string;
  date_to?: string;
  sort_by?: 'recent' | 'upcoming' | 'price';
}

// Verification Types

export interface ProviderVerificationStatus {
  email_verified: boolean;
  license_verified: boolean;
  insurance_verified: boolean;
  identity_verified: boolean;
  background_check_status?: 'pending' | 'approved' | 'rejected';
  overall_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  appeal_available: boolean;
}

// Analytics Types

export interface ProviderAnalytics {
  period: 'week' | 'month' | 'year';
  total_views: number;
  total_clicks: number;
  total_bookings: number;
  total_revenue: number;
  average_rating: number;
  review_count: number;
  response_rate: number;
  daily_data: Array<{
    date: string;
    views: number;
    bookings: number;
    revenue: number;
  }>;
}

// Dispute Types

export interface Dispute {
  id: string;
  booking_id: string;
  initiator_user_id: string;
  dispute_type: 'refund' | 'cancellation' | 'quality' | 'safety' | 'other';
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'appealed';
  resolution?: {
    decision: 'full_refund' | 'partial_refund' | 'no_refund' | 'credit';
    amount?: number;
    reason: string;
  };
  created_at: string;
  updated_at: string;
}
