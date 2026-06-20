/**
 * Equipment Rental System - Barrel Export
 * Import everything from @/lib/equipment
 */

// Export all client functions
export * from './equipment-client';

// Export all schemas and types
export * from './schemas';

// Export all utilities
export * from './equipment-utils';

// Export default imports for convenience
export {
  calculateRentalCost,
  calculateCommission,
  calculateEquipmentCommission,
  validateRentalDates,
} from './schemas';

export {
  calculateRentalPricing,
  formatPrice,
  formatRentalDuration,
  getAvailabilityStatus,
  getConditionLabel,
  getRentalStatusLabel,
  getEquipmentIcon,
} from './equipment-utils';
