/**
 * Payment Package System Types
 * Defines all TypeScript interfaces for payment packages and confirmations
 */

// ============================================================================
// ENUMS & UNION TYPES
// ============================================================================

export type PackageStatus = 'pending_confirmations' | 'completed' | 'failed';
export type ConfirmationStatus = 'pending' | 'confirmed';
export type ServiceCategory = 'guide' | 'shuttle' | 'free_diving' | 'refresher' | 'training' | 'equipment' | 'boat';
export type NotificationType = 'payment_confirmation' | 'payment_confirmed' | 'package_completed';

// ============================================================================
// PAYMENT PACKAGE TYPES
// ============================================================================

/**
 * Payment package containing multiple services from different providers
 */
export interface PaymentPackage {
  id: string;
  customer_id: string;
  status: PackageStatus;
  total_amount: number;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

/**
 * Item within a payment package (single service from one provider)
 */
export interface PackageItem {
  id: string;
  package_id: string;
  provider_id: string;
  service_name: string;
  service_category: ServiceCategory;
  price: number;
  created_at: string;
}

/**
 * Provider's confirmation of payment receipt
 */
export interface ProviderConfirmation {
  id: string;
  package_id: string;
  provider_id: string;
  confirmed_at: string | null;
  confirmed_by_user_id: string | null;
  status: ConfirmationStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Notification sent to provider
 */
export interface ProviderNotification {
  id: string;
  provider_id: string;
  package_id: string;
  type: NotificationType;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

// ============================================================================
// AGGREGATE TYPES
// ============================================================================

/**
 * Complete package with items and confirmations
 */
export interface PackageDetail extends PaymentPackage {
  items: PackageItem[];
  confirmations: ProviderConfirmation[];
  customer?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Package with confirmation status summary
 */
export interface PackageWithStatus extends PaymentPackage {
  items_count: number;
  confirmed_count: number;
  pending_providers: Array<{
    provider_id: string;
    provider_name: string;
  }>;
}

// ============================================================================
// REQUEST & RESPONSE TYPES
// ============================================================================

/**
 * Request to create a new payment package
 */
export interface CreatePackageRequest {
  customer_id: string;
  items: Array<{
    provider_id: string;
    service_name: string;
    service_category: ServiceCategory;
    price: number;
  }>;
}

/**
 * Response from package creation
 */
export interface CreatePackageResponse {
  id: string;
  status: PackageStatus;
  total_amount: number;
  items_count: number;
  created_at: string;
}

/**
 * Request to confirm payment by provider
 */
export interface ConfirmPaymentRequest {
  confirmation_id: string;
}

/**
 * Response from payment confirmation
 */
export interface ConfirmPaymentResponse {
  confirmed: boolean;
  confirmation_id: string;
  package_status: PackageStatus;
  remaining_confirmations: number;
}

/**
 * Notification data sent to provider
 */
export interface PaymentConfirmationNotificationData {
  items: Array<{
    service_name: string;
    service_category: ServiceCategory;
    price: number;
  }>;
  total: number;
  customer_name: string;
  confirmation_id: string;
  action_required: boolean;
}

// ============================================================================
// EMAIL TEMPLATE TYPES
// ============================================================================

/**
 * Data passed to customer confirmation email template
 */
export interface EmailConfirmationData {
  customer_name: string;
  customer_email: string;
  package_id: string;
  items: Array<{
    service_name: string;
    provider_name: string;
    price: number;
  }>;
  total_amount: number;
  created_at: string;
  dive_site?: string;
  booking_date?: string;
  booking_time?: string;
  providers: Array<{
    name: string;
    phone?: string;
    email?: string;
    experience?: number;
  }>;
}
