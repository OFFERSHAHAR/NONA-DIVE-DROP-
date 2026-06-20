/**
 * Centralized Zustand Store Registry
 * All application stores consolidated in single location with organized subdirectories
 *
 * Import patterns:
 * - Direct import: import { useAuthStore } from '@/stores'
 * - Category import: import * as authStores from '@/stores/auth'
 * - File-specific: import { useAuthStore } from '@/stores/auth/authStore'
 */

// Auth stores
export { useAuthStore } from './auth/authStore';
export { useFreeDivingStore } from './auth/free-diving-store';

// Booking stores
export { useBookingStore, BookingStates } from './booking/bookingStore';
export type { BookingStoreState, BookingStep, BookingDraft } from './booking/bookingStore';

// Buddy stores
export { useBuddyStore } from './buddy/buddy-store';

// Admin stores
export { useAdminStore } from './admin/adminStore';
export { useEquipmentAdminStore } from './admin/equipmentAdminStore';

// Service provider stores
export { useServiceProviderStore } from './service-provider/serviceProviderStore';

// Category exports for organized imports
export * as authStores from './auth';
export * as bookingStores from './booking';
export * as buddyStores from './buddy';
export * as adminStores from './admin';
export * as serviceProviderStores from './service-provider';
