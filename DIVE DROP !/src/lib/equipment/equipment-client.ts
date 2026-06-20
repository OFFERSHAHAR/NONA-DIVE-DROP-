/**
 * Equipment Rental Client Service
 * Handles all equipment rental data operations
 */

import { createClient } from '@supabase/supabase-js';
import type {
  EquipmentListing,
  EquipmentRental,
  EquipmentReview,
  EquipmentMessage,
  SearchEquipmentListingsInput,
  MyEquipmentListingsInput,
  MyRentalsInput,
  RentalFiltersInput,
} from '@/types/equipment';
import type {
  CreateEquipmentListingInput,
  UpdateEquipmentListingInput,
  RequestEquipmentRentalInput,
  ReturnEquipmentInput,
  CreateEquipmentReviewInput,
  SendEquipmentMessageInput,
} from '@/lib/equipment/schemas';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// EQUIPMENT LISTINGS
// ============================================================================

/**
 * Create a new equipment listing
 */
export async function createEquipmentListing(
  userId: string,
  input: CreateEquipmentListingInput
): Promise<EquipmentListing> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('equipment_listings')
    .insert({
      owner_id: userId,
      equipment_type: input.equipment_type,
      brand: input.brand,
      model: input.model,
      description: input.description,
      size: input.size,
      condition: input.condition,
      year_purchased: input.year_purchased,
      available_from: input.available_from,
      available_until: input.available_until,
      location: {
        lat: input.location_lat,
        lng: input.location_lng,
      },
      location_name: input.location_name,
      location_radius_km: input.location_radius_km || 50,
      rental_price_per_day: input.rental_price_per_day,
      min_rental_days: input.min_rental_days,
      max_rental_days: input.max_rental_days,
      discount_per_week: input.discount_per_week,
      delivery_fee: input.delivery_fee,
      photo_urls: input.photo_urls,
      is_active: true,
      total_rentals: 0,
      review_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update equipment listing
 */
export async function updateEquipmentListing(
  listingId: string,
  userId: string,
  input: UpdateEquipmentListingInput
): Promise<EquipmentListing> {
  const { data, error } = await supabase
    .from('equipment_listings')
    .update({
      ...input,
      location: input.location_lat
        ? {
            lat: input.location_lat,
            lng: input.location_lng,
          }
        : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .eq('owner_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get equipment listing by ID
 */
export async function getEquipmentListing(
  listingId: string
): Promise<EquipmentListing | null> {
  const { data, error } = await supabase
    .from('equipment_listings')
    .select('*')
    .eq('id', listingId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Search equipment listings
 */
export async function searchEquipmentListings(
  input: SearchEquipmentListingsInput
): Promise<{ data: EquipmentListing[]; total: number }> {
  let query = supabase
    .from('equipment_listings')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (input.equipment_type) {
    query = query.eq('equipment_type', input.equipment_type);
  }

  if (input.condition) {
    query = query.eq('condition', input.condition);
  }

  if (input.price_min !== undefined) {
    query = query.gte('rental_price_per_day', input.price_min);
  }

  if (input.price_max !== undefined) {
    query = query.lte('rental_price_per_day', input.price_max);
  }

  if (input.min_rating !== undefined) {
    query = query.gte('rating_average', input.min_rating);
  }

  // Handle sorting
  if (input.sort_by === 'price_low') {
    query = query.order('rental_price_per_day', { ascending: true });
  } else if (input.sort_by === 'price_high') {
    query = query.order('rental_price_per_day', { ascending: false });
  } else if (input.sort_by === 'rating') {
    query = query.order('rating_average', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Handle pagination
  const offset = (input.page - 1) * input.limit;
  query = query.range(offset, offset + input.limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // Client-side distance filtering if location provided
  let filtered = data || [];
  if (input.location_lat !== undefined && input.location_lng !== undefined) {
    filtered = filtered.filter((listing) => {
      const distance = calculateDistance(
        input.location_lat!,
        input.location_lng!,
        listing.location.lat,
        listing.location.lng
      );
      return distance <= input.max_distance_km;
    });
  }

  return {
    data: filtered,
    total: count || 0,
  };
}

/**
 * Get my equipment listings
 */
export async function getMyEquipmentListings(
  userId: string,
  input: MyEquipmentListingsInput
): Promise<{ data: EquipmentListing[]; total: number }> {
  let query = supabase
    .from('equipment_listings')
    .select('*', { count: 'exact' })
    .eq('owner_id', userId);

  if (input.status !== 'all') {
    query = query.eq('is_active', input.status === 'active');
  }

  if (input.sort_by === 'price_high') {
    query = query.order('rental_price_per_day', { ascending: false });
  } else if (input.sort_by === 'price_low') {
    query = query.order('rental_price_per_day', { ascending: true });
  } else if (input.sort_by === 'most_rented') {
    query = query.order('total_rentals', { ascending: false });
  } else if (input.sort_by === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const offset = (input.page - 1) * input.limit;
  const { data, error, count } = await query.range(offset, offset + input.limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * Deactivate listing
 */
export async function deactivateEquipmentListing(
  listingId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('equipment_listings')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('owner_id', userId);

  if (error) throw error;
}

// ============================================================================
// EQUIPMENT RENTALS
// ============================================================================

/**
 * Create rental request
 */
export async function requestEquipmentRental(
  renterId: string,
  input: RequestEquipmentRentalInput
): Promise<EquipmentRental> {
  // Get listing to calculate pricing
  const listing = await getEquipmentListing(input.listing_id);
  if (!listing) throw new Error('Equipment listing not found');

  // Get listing owner
  const { data: ownerData } = await supabase
    .from('equipment_listings')
    .select('owner_id')
    .eq('id', input.listing_id)
    .single();

  const listerId = ownerData?.owner_id;
  if (!listerId) throw new Error('Listing owner not found');

  // Calculate rental duration
  const startDate = new Date(input.rental_start);
  const endDate = new Date(input.rental_end);
  const rentalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate costs
  const rentalCost = listing.rental_price_per_day * rentalDays;
  const commissionAmount = Math.round(rentalCost * 0.15); // 15% commission
  const renterTotal = rentalCost;
  const listerPayout = rentalCost - commissionAmount;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('equipment_rentals')
    .insert({
      lister_id: listerId,
      renter_id: renterId,
      listing_id: input.listing_id,
      rental_start: input.rental_start,
      rental_end: input.rental_end,
      rental_days: rentalDays,
      daily_rate: listing.rental_price_per_day,
      rental_cost: rentalCost,
      commission_amount: commissionAmount,
      renter_total: renterTotal,
      lister_payout: listerPayout,
      delivery_method: input.delivery_method,
      delivery_address: input.delivery_address,
      renter_contact: input.renter_contact,
      status: 'pending',
      damage_assessment_required: false,
      requested_at: now,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get rental by ID
 */
export async function getEquipmentRental(
  rentalId: string
): Promise<EquipmentRental | null> {
  const { data, error } = await supabase
    .from('equipment_rentals')
    .select('*')
    .eq('id', rentalId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Get my rentals
 */
export async function getMyRentals(
  userId: string,
  input: MyRentalsInput
): Promise<{ data: EquipmentRental[]; total: number }> {
  let query = supabase
    .from('equipment_rentals')
    .select('*', { count: 'exact' })
    .eq('renter_id', userId);

  if (input.status !== 'all') {
    query = query.eq('status', input.status);
  }

  if (input.sort_by === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else if (input.sort_by === 'price_high') {
    query = query.order('rental_cost', { ascending: false });
  } else if (input.sort_by === 'price_low') {
    query = query.order('rental_cost', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const offset = (input.page - 1) * input.limit;
  const { data, error, count } = await query.range(offset, offset + input.limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * Get rental requests for lister
 */
export async function getListerRentalRequests(
  userId: string,
  input: RentalFiltersInput
): Promise<{ data: EquipmentRental[]; total: number }> {
  let query = supabase
    .from('equipment_rentals')
    .select('*', { count: 'exact' })
    .eq('lister_id', userId);

  if (input.status) {
    query = query.eq('status', input.status);
  }

  if (input.date_from) {
    query = query.gte('rental_start', input.date_from);
  }

  if (input.date_to) {
    query = query.lte('rental_end', input.date_to);
  }

  if (input.sort_by === 'oldest') {
    query = query.order('requested_at', { ascending: true });
  } else if (input.sort_by === 'price_high') {
    query = query.order('rental_cost', { ascending: false });
  } else if (input.sort_by === 'price_low') {
    query = query.order('rental_cost', { ascending: true });
  } else {
    query = query.order('requested_at', { ascending: false });
  }

  const offset = (input.page - 1) * input.limit;
  const { data, error, count } = await query.range(offset, offset + input.limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * Approve rental request
 */
export async function approveEquipmentRental(
  rentalId: string,
  listerId: string
): Promise<EquipmentRental> {
  const { data, error } = await supabase
    .from('equipment_rentals')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .eq('lister_id', listerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Reject rental request
 */
export async function rejectEquipmentRental(
  rentalId: string,
  listerId: string,
  reason: string
): Promise<EquipmentRental> {
  const { data, error } = await supabase
    .from('equipment_rentals')
    .update({
      status: 'rejected',
      rejected_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .eq('lister_id', listerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark rental as active after payment
 */
export async function activateEquipmentRental(
  rentalId: string,
  transactionId: string
): Promise<EquipmentRental> {
  const { data, error } = await supabase
    .from('equipment_rentals')
    .update({
      status: 'active',
      transaction_id: transactionId,
      paid_at: new Date().toISOString(),
      active_from: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Return equipment
 */
export async function returnEquipment(
  rentalId: string,
  renterId: string,
  input: ReturnEquipmentInput
): Promise<EquipmentRental> {
  const { data, error } = await supabase
    .from('equipment_rentals')
    .update({
      status: 'damage_pending',
      damage_assessment_required: true,
      damage_level: input.damage_level,
      damage_description: input.damage_description,
      damage_photos: input.damage_photos,
      damage_cost: input.damage_cost,
      returned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .eq('renter_id', renterId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete rental after damage assessment
 */
export async function completeEquipmentRental(
  rentalId: string,
  listerId: string
): Promise<EquipmentRental> {
  const { data, error } = await supabase
    .from('equipment_rentals')
    .update({
      status: 'completed',
      damage_assessment_required: false,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .eq('lister_id', listerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// EQUIPMENT REVIEWS
// ============================================================================

/**
 * Create equipment review
 */
export async function createEquipmentReview(
  reviewerId: string,
  input: CreateEquipmentReviewInput
): Promise<EquipmentReview> {
  const { data, error } = await supabase
    .from('equipment_reviews')
    .insert({
      listing_id: input.listing_id,
      rental_id: input.rental_id,
      reviewer_id: reviewerId,
      rating: input.rating,
      condition_rating: input.condition_rating,
      communication_rating: input.communication_rating,
      comment: input.comment,
      tags: input.tags,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Update listing rating
  await updateListingRating(input.listing_id);

  return data;
}

/**
 * Get reviews for listing
 */
export async function getEquipmentReviews(
  listingId: string
): Promise<EquipmentReview[]> {
  const { data, error } = await supabase
    .from('equipment_reviews')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update listing rating (called after review)
 */
async function updateListingRating(listingId: string): Promise<void> {
  const reviews = await getEquipmentReviews(listingId);

  if (reviews.length === 0) return;

  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await supabase
    .from('equipment_listings')
    .update({
      rating_average: Math.round(avgRating * 10) / 10,
      review_count: reviews.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId);
}

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * Send message in rental chat
 */
export async function sendEquipmentMessage(
  senderId: string,
  input: SendEquipmentMessageInput
): Promise<EquipmentMessage> {
  // Determine sender role
  const rental = await getEquipmentRental(input.rental_id);
  if (!rental) throw new Error('Rental not found');

  const senderRole =
    senderId === rental.lister_id ? ('lister' as const) : ('renter' as const);

  const { data, error } = await supabase
    .from('equipment_messages')
    .insert({
      rental_id: input.rental_id,
      sender_id: senderId,
      sender_role: senderRole,
      message_type: input.image_url ? 'image' : 'text',
      content: input.content,
      image_url: input.image_url,
      is_read: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get messages for rental
 */
export async function getEquipmentMessages(
  rentalId: string
): Promise<EquipmentMessage[]> {
  const { data, error } = await supabase
    .from('equipment_messages')
    .select('*')
    .eq('rental_id', rentalId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Mark messages as read
 */
export async function markEquipmentMessagesAsRead(
  rentalId: string,
  userId: string
): Promise<void> {
  await supabase
    .from('equipment_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('rental_id', rentalId)
    .neq('sender_id', userId)
    .eq('is_read', false);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
  return R * c;
}
