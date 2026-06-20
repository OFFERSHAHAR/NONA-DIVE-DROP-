/**
 * Equipment Rental Utility Functions
 * Helper functions for calculations, formatting, and business logic
 */

import type { EquipmentRental, EquipmentListing } from '@/types/equipment';

// ============================================================================
// PRICING CALCULATIONS
// ============================================================================

/**
 * Calculate total rental cost including commission breakdown
 */
export function calculateRentalPricing(
  listing: EquipmentListing,
  rentalDays: number,
  commissionRate: number = 0.15
) {
  // Calculate daily rate (apply discount if applicable)
  let dailyRate = listing.rental_price_per_day;
  let discount = 0;

  // Apply weekly discount if qualifying
  if (listing.discount_per_week && rentalDays >= 7) {
    const weeks = Math.floor(rentalDays / 7);
    discount = Math.round(
      (listing.rental_price_per_day * listing.discount_per_week * weeks) / 100
    );
  }

  // Calculate rental cost
  const rentalCost = listing.rental_price_per_day * rentalDays - discount;

  // Calculate commission
  const commissionAmount = Math.round(rentalCost * commissionRate);

  // Add delivery fee if applicable
  const deliveryFee = listing.delivery_fee || 0;

  // Calculate totals
  const renterTotal = rentalCost + deliveryFee;
  const listerPayout = rentalCost - commissionAmount;

  return {
    dailyRate,
    rentalDays,
    subtotal: listing.rental_price_per_day * rentalDays,
    discount,
    rentalCost,
    deliveryFee,
    commissionAmount,
    commissionPercent: (commissionAmount / rentalCost) * 100,
    renterTotal,
    listerPayout,
    breakdown: {
      renterPays: renterTotal,
      diveDropCommission: commissionAmount,
      listerReceives: listerPayout,
      deliveryIncluded: deliveryFee > 0,
    },
  };
}

/**
 * Calculate damage cost impact on payout
 */
export function calculateDamageImpact(
  rentalData: EquipmentRental,
  damageRepairCost: number
) {
  const originalPayout = rentalData.lister_payout;
  const adjustedPayout = Math.max(0, originalPayout - damageRepairCost);
  const damageLoss = originalPayout - adjustedPayout;

  return {
    originalPayout,
    damageRepairCost,
    adjustedPayout,
    damageLoss,
    damageCoverageRate:
      (rentalData.damage_cost || 0) > 0
        ? Math.min(100, ((rentalData.damage_cost || 0) / damageRepairCost) * 100)
        : 0,
  };
}

// ============================================================================
// AVAILABILITY CHECKING
// ============================================================================

/**
 * Check if a listing is available for requested dates
 */
export function isListingAvailable(
  listing: EquipmentListing,
  rentalStart: Date,
  rentalEnd: Date
): { available: boolean; reason?: string } {
  const listingStart = new Date(listing.available_from);
  const listingEnd = listing.available_until
    ? new Date(listing.available_until)
    : null;
  const now = new Date();

  // Check if listing is active
  if (!listing.is_active) {
    return { available: false, reason: 'Listing is not active' };
  }

  // Check if rental starts before listing availability
  if (rentalStart < listingStart) {
    return {
      available: false,
      reason: `Equipment available from ${listingStart.toLocaleDateString()}`,
    };
  }

  // Check if rental ends after listing availability
  if (listingEnd && rentalEnd > listingEnd) {
    return {
      available: false,
      reason: `Equipment available until ${listingEnd.toLocaleDateString()}`,
    };
  }

  // Check if rental period meets minimum/maximum
  const days = Math.ceil(
    (rentalEnd.getTime() - rentalStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (listing.min_rental_days && days < listing.min_rental_days) {
    return {
      available: false,
      reason: `Minimum rental period is ${listing.min_rental_days} days`,
    };
  }

  if (listing.max_rental_days && days > listing.max_rental_days) {
    return {
      available: false,
      reason: `Maximum rental period is ${listing.max_rental_days} days`,
    };
  }

  return { available: true };
}

/**
 * Get availability status text
 */
export function getAvailabilityStatus(
  listing: EquipmentListing
): 'available' | 'coming_soon' | 'unavailable' {
  const now = new Date();
  const availFrom = new Date(listing.available_from);
  const availTo = listing.available_until
    ? new Date(listing.available_until)
    : null;

  if (!listing.is_active) {
    return 'unavailable';
  }

  if (now < availFrom) {
    return 'coming_soon';
  }

  if (availTo && now > availTo) {
    return 'unavailable';
  }

  return 'available';
}

// ============================================================================
// FORMATTING & DISPLAY
// ============================================================================

/**
 * Format currency for display (Israeli Shekel)
 */
export function formatPrice(cents: number, currency: string = 'ILS'): string {
  const symbols: Record<string, string> = {
    ILS: '₪',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbols[currency] ?? currency;
  const amount = (cents / 100).toFixed(2);

  return `${symbol}${amount}`;
}

/**
 * Format rental duration
 */
export function formatRentalDuration(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days === 7) return '1 week';

  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;

  if (remainingDays === 0) {
    return `${weeks} weeks`;
  }

  return `${weeks} weeks, ${remainingDays} days`;
}

/**
 * Format date range
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string
): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const locale = 'en-US';
  const startStr = start.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
  const endStr = end.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startStr} - ${endStr}`;
}

// ============================================================================
// CONDITION & STATUS HELPERS
// ============================================================================

/**
 * Get display name for equipment condition
 */
export function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    excellent: 'Like New',
    very_good: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Needs Repair',
  };

  return labels[condition] || condition;
}

/**
 * Get color for condition badge
 */
export function getConditionColor(condition: string): string {
  const colors: Record<string, string> = {
    excellent: 'bg-green-100 text-green-800',
    very_good: 'bg-emerald-100 text-emerald-800',
    good: 'bg-blue-100 text-blue-800',
    fair: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-orange-100 text-orange-800',
  };

  return colors[condition] || 'bg-gray-100 text-gray-800';
}

/**
 * Get display name for rental status
 */
export function getRentalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Awaiting Approval',
    approved: 'Approved - Ready to Pay',
    rejected: 'Rejected',
    active: 'Active Rental',
    returned: 'Returned',
    damage_pending: 'Assessing Damage',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return labels[status] || status;
}

/**
 * Get color for status badge
 */
export function getRentalStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800',
    approved: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    returned: 'bg-purple-100 text-purple-800',
    damage_pending: 'bg-orange-100 text-orange-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get equipment icon emoji
 */
export function getEquipmentIcon(equipmentType: string): string {
  const icons: Record<string, string> = {
    fins: '🦶',
    wetsuit: '🏊',
    tank: '🎒',
    weights: '⚖️',
    bcd: '📦',
    regulator: '🌊',
    mask: '👁️',
    snorkel: '💨',
    dive_computer: '⌚',
    torch: '🔦',
    knife: '🔪',
    camera: '📸',
    clothing: '👕',
    other: '🎁',
  };

  return icons[equipmentType] || '🎁';
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Calculate lister statistics
 */
export function calculateListerStats(rentals: EquipmentRental[]) {
  const completed = rentals.filter((r) => r.status === 'completed').length;
  const active = rentals.filter((r) => r.status === 'active').length;
  const totalEarnings = rentals
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.lister_payout, 0);

  return {
    totalRentals: rentals.length,
    completedRentals: completed,
    activeRentals: active,
    totalEarnings,
    averageRentalCost: completed > 0 ? totalEarnings / completed : 0,
  };
}

/**
 * Calculate renter statistics
 */
export function calculateRenterStats(rentals: EquipmentRental[]) {
  const completed = rentals.filter((r) => r.status === 'completed').length;
  const totalSpent = rentals.reduce((sum, r) => sum + r.renter_total, 0);
  const withDamage = rentals.filter(
    (r) => r.damage_level && r.damage_level !== 'none'
  ).length;

  return {
    totalRentals: rentals.length,
    completedRentals: completed,
    totalSpent,
    averageRentalCost: completed > 0 ? totalSpent / completed : 0,
    rentalsWithDamage: withDamage,
    damageRate:
      completed > 0 ? Math.round((withDamage / completed) * 100) : 0,
  };
}

/**
 * Generate earnings summary for period
 */
export function generateEarningsSummary(
  rentals: EquipmentRental[],
  startDate: Date,
  endDate: Date
) {
  const periodRentals = rentals.filter((r) => {
    const completed = r.completed_at ? new Date(r.completed_at) : null;
    return completed && completed >= startDate && completed <= endDate;
  });

  const grossEarnings = periodRentals.reduce((sum, r) => sum + r.rental_cost, 0);
  const totalCommission = periodRentals.reduce(
    (sum, r) => sum + r.commission_amount,
    0
  );
  const netEarnings = grossEarnings - totalCommission;

  return {
    period: {
      start: startDate,
      end: endDate,
    },
    totalRentals: periodRentals.length,
    grossEarnings,
    totalCommission,
    commissionPercent: (totalCommission / grossEarnings) * 100,
    netEarnings,
    averagePerRental: periodRentals.length > 0 ? netEarnings / periodRentals.length : 0,
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate equipment listing data
 */
export function validateEquipmentListing(
  data: Partial<any>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.equipment_type) {
    errors.equipment_type = 'Equipment type is required';
  }

  if (!data.description || data.description.length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  if (!data.condition) {
    errors.condition = 'Condition is required';
  }

  if (!data.location_name) {
    errors.location_name = 'Location is required';
  }

  if (!data.rental_price_per_day || data.rental_price_per_day < 100) {
    errors.rental_price_per_day = 'Price must be at least ₪1';
  }

  if (!data.photo_urls || data.photo_urls.length === 0) {
    errors.photo_urls = 'At least one photo is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
