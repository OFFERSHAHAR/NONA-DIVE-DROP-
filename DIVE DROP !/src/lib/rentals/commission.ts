/**
 * Commission Calculation Service for Equipment Rentals
 * Handles all commission-related calculations and tracking
 */

import { createServerClient } from '@supabase/ssr';

export interface CommissionCalculation {
  rentalCostCents: number;
  commissionRate: number;
  commissionCents: number;
  netToListerCents: number;
}

export interface RentalFinancials {
  dailyPriceCents: number;
  rentalDays: number;
  subtotalCents: number;
  depositCents: number;
  insuranceCents: number;
  rentalCostCents: number;
  totalCostCents: number;
  commissionCents: number;
  netToListerCents: number;
}

/**
 * Calculate commission amount based on rental cost and commission rate
 *
 * @example
 * // Equipment: 50₪/day (5000 cents)
 * // Rental: 7 days = 350₪ (350000 cents)
 * // Commission rate: 10% (0.10)
 * const commission = calculateCommission(350000, 0.10);
 * // Result: 35000 (35₪)
 */
export function calculateCommission(
  rentalCostCents: number,
  commissionRate: number
): CommissionCalculation {
  if (rentalCostCents <= 0) {
    throw new Error('Rental cost must be greater than 0');
  }

  if (commissionRate < 0.01 || commissionRate > 0.50) {
    throw new Error('Commission rate must be between 1% and 50%');
  }

  const commissionCents = Math.round(rentalCostCents * commissionRate);
  const netToListerCents = rentalCostCents - commissionCents;

  return {
    rentalCostCents,
    commissionRate,
    commissionCents,
    netToListerCents,
  };
}

/**
 * Calculate full rental financials
 *
 * @example
 * const financials = calculateRentalFinancials({
 *   dailyPriceCents: 5000,    // 50₪
 *   rentalDays: 7,
 *   commissionRate: 0.10,      // 10%
 *   depositCents: 10000,       // 100₪ deposit
 *   insuranceCents: 2000       // 20₪ insurance
 * });
 * // Result: {
 * //   rentalCostCents: 350000 (350₪ to lister)
 * //   commissionCents: 35000 (35₪ to DIVE DROP)
 * //   totalCostCents: 362000 (362₪ renter pays)
 * // }
 */
export function calculateRentalFinancials(params: {
  dailyPriceCents: number;
  rentalDays: number;
  commissionRate: number;
  depositCents?: number;
  insuranceCents?: number;
}): RentalFinancials {
  const {
    dailyPriceCents,
    rentalDays,
    commissionRate,
    depositCents = 0,
    insuranceCents = 0,
  } = params;

  if (dailyPriceCents <= 0) {
    throw new Error('Daily price must be greater than 0');
  }

  if (rentalDays <= 0) {
    throw new Error('Rental days must be greater than 0');
  }

  // Calculate base amounts
  const subtotalCents = dailyPriceCents * rentalDays;
  const rentalCostCents = subtotalCents + insuranceCents;

  // Calculate commission
  const commissionCents = calculateCommission(rentalCostCents, commissionRate).commissionCents;
  const netToListerCents = rentalCostCents - commissionCents;

  // Total cost to renter (includes rental + insurance + deposit)
  const totalCostCents = rentalCostCents + depositCents;

  return {
    dailyPriceCents,
    rentalDays,
    subtotalCents,
    depositCents,
    insuranceCents,
    rentalCostCents,
    totalCostCents,
    commissionCents,
    netToListerCents,
  };
}

/**
 * Format amount in cents to currency display
 * @example formatCurrency(350000) => "350₪"
 */
export function formatCurrency(cents: number): string {
  return `₪${(cents / 100).toFixed(2)}`;
}

/**
 * Format commission breakdown for invoice display
 */
export function formatCommissionBreakdown(
  rentalCostCents: number,
  commissionRate: number
): string {
  const result = calculateCommission(rentalCostCents, commissionRate);
  return (
    `Rental: ${formatCurrency(rentalCostCents)} | ` +
    `Commission (${(commissionRate * 100).toFixed(0)}%): ${formatCurrency(result.commissionCents)} | ` +
    `To Lister: ${formatCurrency(result.netToListerCents)}`
  );
}

/**
 * Calculate damage charge commission (damage charges are also subject to commission)
 */
export function calculateDamageCommission(
  damageCostCents: number,
  commissionRate: number
): CommissionCalculation {
  return calculateCommission(damageCostCents, commissionRate);
}

/**
 * Generate invoice number for a given month and sequence
 * Format: INV-202406-001
 */
export function generateInvoiceNumber(
  year: number,
  month: number,
  sequence: number
): string {
  const yearMonth = `${year}${String(month).padStart(2, '0')}`;
  const seq = String(sequence).padStart(3, '0');
  return `INV-${yearMonth}-${seq}`;
}

/**
 * Calculate invoice due date based on issue date and payment terms
 */
export function calculateDueDate(issueDate: Date, paymentTermsDays: number = 7): Date {
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + paymentTermsDays);
  return dueDate;
}

/**
 * Validate rental dates don't conflict
 * Used when creating new rentals
 */
export async function validateRentalDates(
  listingId: string,
  startDate: Date,
  endDate: Date,
  supabase: ReturnType<typeof createServerClient>
): Promise<{
  isValid: boolean;
  conflictingRentals?: Array<{ id: string; startDate: string; endDate: string }>;
  error?: string;
}> {
  try {
    const { data: conflictingRentals, error } = await supabase
      .from('equipment_rentals')
      .select('id, start_date, end_date')
      .eq('listing_id', listingId)
      .in('status', ['confirmed', 'active'])
      .or(
        `and(start_date.lte.${endDate.toISOString().split('T')[0]},end_date.gte.${startDate.toISOString().split('T')[0]})`
      );

    if (error) {
      return {
        isValid: false,
        error: error.message,
      };
    }

    if (conflictingRentals && conflictingRentals.length > 0) {
      return {
        isValid: false,
        conflictingRentals: conflictingRentals.map((r) => ({
          id: r.id,
          startDate: r.start_date,
          endDate: r.end_date,
        })),
      };
    }

    return { isValid: true };
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Calculate rental days between two dates
 */
export function calculateRentalDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Commission status workflow helper
 */
export const COMMISSION_WORKFLOW = {
  pending: 'pending', // Awaiting collection
  invoiced: 'invoiced', // Invoice sent to lister
  paid: 'paid', // Lister paid commission to DIVE DROP
  disputed: 'disputed', // Payment disputed
} as const;

/**
 * Rental status workflow helper
 */
export const RENTAL_WORKFLOW = {
  pending: 'pending', // Awaiting payment
  confirmed: 'confirmed', // Payment received, awaiting pickup
  active: 'active', // Equipment is rented out
  returned: 'returned', // Equipment returned
  cancelled: 'cancelled', // Rental cancelled
  dispute: 'dispute', // Dispute raised
} as const;

/**
 * Damage severity and typical costs
 */
export const DAMAGE_SEVERITY_GUIDELINES = {
  minor: {
    label: 'Minor (cosmetic)',
    typicalCostRange: { min: 1000, max: 5000 }, // 10-50₪
  },
  moderate: {
    label: 'Moderate (needs repair)',
    typicalCostRange: { min: 5000, max: 50000 }, // 50-500₪
  },
  severe: {
    label: 'Severe (non-functional)',
    typicalCostRange: { min: 50000, max: 200000 }, // 500-2000₪
  },
  total_loss: {
    label: 'Total loss',
    typicalCostRange: { min: 200000, max: 500000 }, // 2000-5000₪
  },
} as const;

/**
 * Check if damage charge is within expected range for severity level
 */
export function validateDamageCost(
  severity: keyof typeof DAMAGE_SEVERITY_GUIDELINES,
  costCents: number
): {
  isValid: boolean;
  warning?: string;
} {
  const guidelines = DAMAGE_SEVERITY_GUIDELINES[severity];
  const { min, max } = guidelines.typicalCostRange;

  if (costCents < min) {
    return {
      isValid: true,
      warning: `Cost is below typical range for ${guidelines.label}`,
    };
  }

  if (costCents > max) {
    return {
      isValid: true,
      warning: `Cost is above typical range for ${guidelines.label}`,
    };
  }

  return { isValid: true };
}
