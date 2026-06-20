import { BookingStatusType } from './schemas';

/**
 * Booking state machine transitions
 */
export const allowedTransitions: Record<BookingStatusType, BookingStatusType[]> = {
  draft: ['pending_confirmation', 'cancelled'],
  pending_confirmation: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
};

/**
 * Check if a status transition is allowed
 */
export function canTransition(
  currentStatus: BookingStatusType,
  newStatus: BookingStatusType
): boolean {
  return allowedTransitions[currentStatus].includes(newStatus);
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(
  status: BookingStatusType,
  locale: 'en' | 'he' = 'en'
): string {
  const labels = {
    en: {
      draft: 'Draft',
      pending_confirmation: 'Awaiting Confirmation',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
    },
    he: {
      draft: 'טיוטה',
      pending_confirmation: 'בהמתנה לאישור',
      confirmed: 'מאושר',
      completed: 'הושלם',
      cancelled: 'בוטל',
      rejected: 'נדחה',
    },
  };

  return labels[locale][status] || status;
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: BookingStatusType): string {
  const colors = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    pending_confirmation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200',
  };

  return colors[status] || colors.draft;
}

/**
 * Format booking date
 */
export function formatBookingDate(date: string | Date, locale: 'en' | 'he' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (locale === 'he') {
    return d.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate booking cost (placeholder - integrate with payment service)
 */
export function calculateBookingCost(
  numberOfDivers: number,
  durationMinutes: number,
  hasEquipmentNeeded: boolean = false,
  pricePerDiver: number = 100
): { subtotal: number; equipment: number; total: number } {
  const subtotal = numberOfDivers * pricePerDiver;
  const equipment = hasEquipmentNeeded ? numberOfDivers * 50 : 0;
  const total = subtotal + equipment;

  return { subtotal, equipment, total };
}

/**
 * Check if a booking can be cancelled
 */
export function canCancelBooking(
  status: BookingStatusType,
  diveDate: Date
): { canCancel: boolean; reason?: string } {
  if (status === 'completed' || status === 'cancelled' || status === 'rejected') {
    return {
      canCancel: false,
      reason:
        status === 'completed'
          ? 'Cannot cancel a completed booking'
          : `Cannot cancel a ${status} booking`,
    };
  }

  const now = new Date();
  const hoursUntilDive = (diveDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDive < 24) {
    return {
      canCancel: false,
      reason: 'Cannot cancel within 24 hours of dive date',
    };
  }

  return { canCancel: true };
}

/**
 * Validate dive safety parameters
 */
export function validateDiveParameters(
  maxDepth: number,
  durationMinutes: number,
  waterTemp: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (maxDepth > 130) {
    return { valid: false, warnings: ['Maximum depth exceeds recreational limits (130m)'] };
  }

  if (maxDepth > 40 && durationMinutes > 45) {
    warnings.push('Deep dives should be limited to 45 minutes');
  }

  if (waterTemp < 5) {
    warnings.push('Water temperature is very cold - ensure proper thermal protection');
  }

  if (waterTemp > 35) {
    warnings.push('Water temperature is very warm - ensure proper hydration');
  }

  if (durationMinutes > 120) {
    warnings.push('Dive duration exceeds recommended limits');
  }

  return { valid: warnings.length === 0 || maxDepth <= 130, warnings };
}

/**
 * Get remaining time until booking confirmation deadline
 */
export function getConfirmationDeadline(createdAt: Date): {
  hoursRemaining: number;
  isExpired: boolean;
} {
  const deadlineHours = 24;
  const now = new Date();
  const createdTime = new Date(createdAt);
  const deadlineTime = new Date(createdTime.getTime() + deadlineHours * 60 * 60 * 1000);

  const hoursRemaining = (deadlineTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return {
    hoursRemaining: Math.max(0, Math.floor(hoursRemaining)),
    isExpired: hoursRemaining < 0,
  };
}

/**
 * Get estimated cost with all fees
 */
export function calculateTotalCost(baseAmount: number, locale: 'en' | 'he' = 'en'): {
  base: number;
  platformFee: number;
  tax: number;
  total: number;
} {
  const platformFeePercent = 0.15; // 15% platform fee
  const taxPercent = 0.17; // 17% VAT

  const platformFee = baseAmount * platformFeePercent;
  const subtotal = baseAmount + platformFee;
  const tax = subtotal * taxPercent;
  const total = subtotal + tax;

  return {
    base: baseAmount,
    platformFee: Math.round(platformFee * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Format depth value with unit
 */
export function formatDepth(depth: number, locale: 'en' | 'he' = 'en'): string {
  if (locale === 'he') {
    return `${depth}m`;
  }
  return `${depth}m`;
}

/**
 * Format temperature value with unit
 */
export function formatTemperature(temp: number, locale: 'en' | 'he' = 'en'): string {
  if (locale === 'he') {
    return `${temp}°C`;
  }
  return `${temp}°C`;
}

/**
 * Check if divers can buddy up based on experience levels
 */
export function canBuddyUp(
  experienceLevel1: string,
  experienceLevel2: string
): { canBuddy: boolean; reason?: string } {
  const levels = ['beginner', 'intermediate', 'advanced', 'professional'];
  const level1Index = levels.indexOf(experienceLevel1);
  const level2Index = levels.indexOf(experienceLevel2);

  if (level1Index === -1 || level2Index === -1) {
    return { canBuddy: false, reason: 'Invalid experience levels' };
  }

  const levelDifference = Math.abs(level1Index - level2Index);

  if (levelDifference > 1) {
    return {
      canBuddy: false,
      reason: 'Experience level difference is too great for safe buddying',
    };
  }

  return { canBuddy: true };
}
