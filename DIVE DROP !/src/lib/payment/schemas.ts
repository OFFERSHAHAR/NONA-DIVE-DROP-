import { z } from 'zod';

/**
 * Zod schemas for payment system validation
 */

// ============================================================================
// PACKAGE CREATION SCHEMA
// ============================================================================

export const CreatePackageItemSchema = z.object({
  provider_id: z.string().uuid('Invalid provider ID'),
  service_name: z.string().min(3, 'Service name must be at least 3 characters'),
  service_category: z.enum([
    'guide',
    'shuttle',
    'free_diving',
    'refresher',
    'training',
    'equipment',
    'boat',
  ]),
  price: z.number().positive('Price must be greater than 0'),
});

export const CreatePackageRequestSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  items: z
    .array(CreatePackageItemSchema)
    .min(1, 'Package must contain at least one item')
    .max(10, 'Package cannot contain more than 10 items'),
});

export type CreatePackageRequest = z.infer<typeof CreatePackageRequestSchema>;
export type CreatePackageItem = z.infer<typeof CreatePackageItemSchema>;

// ============================================================================
// CONFIRMATION SCHEMA
// ============================================================================

export const ConfirmPaymentRequestSchema = z.object({
  confirmation_id: z.string().uuid('Invalid confirmation ID'),
});

export type ConfirmPaymentRequest = z.infer<typeof ConfirmPaymentRequestSchema>;

// ============================================================================
// NOTIFICATION SCHEMA
// ============================================================================

export const PaymentConfirmationNotificationDataSchema = z.object({
  items: z.array(
    z.object({
      service_name: z.string(),
      service_category: z.string(),
      price: z.number().positive(),
    })
  ),
  total: z.number().positive(),
  customer_name: z.string(),
  confirmation_id: z.string().uuid(),
  action_required: z.boolean(),
});

export type PaymentConfirmationNotificationData = z.infer<
  typeof PaymentConfirmationNotificationDataSchema
>;
