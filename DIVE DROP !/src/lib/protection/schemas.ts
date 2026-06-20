/**
 * Protection System Zod Schemas
 * Validation schemas for all protection API endpoints
 */

import { z } from 'zod';

// ============================================================================
// REPUTATION SCHEMAS
// ============================================================================

export const getUserReputationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
});

// ============================================================================
// BLOCKING SCHEMAS
// ============================================================================

export const blockUserSchema = z.object({
  blocked_user_id: z.string().uuid('Invalid user ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  reason_category: z.enum([
    'behavior',
    'non_payment',
    'damage',
    'disrespect',
    'safety_concern',
    'other',
  ]),
  temporary: z.boolean().optional().default(false),
  expires_in_days: z.number().int().positive().optional(),
});

export const unblockUserSchema = z.object({
  blocked_user_id: z.string().uuid('Invalid user ID'),
});

export const requestUnblockSchema = z.object({
  reason: z.string().min(20, 'Please provide a detailed reason'),
});

// ============================================================================
// DEPOSIT SCHEMAS
// ============================================================================

export const requestDepositSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  amount: z.number().positive('Amount must be positive').max(10000, 'Maximum deposit is 10,000'),
  requirement_type: z.enum(['damage_deposit', 'booking_deposit', 'full_amount']),
  related_booking_id: z.string().uuid().optional(),
  reason: z.string().min(5, 'Please provide a reason'),
});

export const confirmDepositPaymentSchema = z.object({
  deposit_id: z.string().uuid('Invalid deposit ID'),
  stripe_charge_id: z.string(),
});

export const claimDepositSchema = z.object({
  deposit_id: z.string().uuid('Invalid deposit ID'),
  description: z.string().min(10, 'Please describe the claim'),
});

export const refundDepositSchema = z.object({
  deposit_id: z.string().uuid('Invalid deposit ID'),
  refund_amount: z.number().positive().optional(),
});

// ============================================================================
// COMPLAINT SCHEMAS
// ============================================================================

export const fileComplaintSchema = z.object({
  complained_against_user_id: z.string().uuid('Invalid user ID'),
  booking_id: z.string().uuid('Invalid booking ID'),
  complaint_type: z.enum([
    'equipment_damage',
    'no_show',
    'non_payment',
    'safety_violation',
    'behavior',
    'false_claims',
    'other',
  ]),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  severity: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  evidence_files: z.array(z.string().url()).optional(),
  photos: z.array(z.string().url()).optional(),
});

export const resolveComplaintSchema = z.object({
  complaint_id: z.string().uuid('Invalid complaint ID'),
  resolution: z.string().min(10, 'Resolution must be detailed'),
  sustained: z.boolean(),
});

export const appealComplaintSchema = z.object({
  complaint_id: z.string().uuid('Invalid complaint ID'),
  appeal_reason: z.string().min(20, 'Please provide detailed reasoning'),
});

// ============================================================================
// DAMAGE CLAIM SCHEMAS
// ============================================================================

export const fileDamageClaimSchema = z.object({
  renter_id: z.string().uuid('Invalid renter ID'),
  booking_id: z.string().uuid('Invalid booking ID'),
  item_name: z.string().min(3, 'Item name required'),
  item_value: z.number().positive('Item value must be positive'),
  damage_type: z.enum(['broken', 'lost', 'damaged', 'wear_and_tear']),
  damage_description: z.string().min(10, 'Describe the damage'),
  estimated_repair_cost: z.number().positive('Repair cost must be positive'),
  claim_amount: z.number().positive('Claim amount must be positive'),
  photos: z.array(z.string().url()).optional(),
});

export const reviewDamageClaimSchema = z.object({
  claim_id: z.string().uuid('Invalid claim ID'),
  approved: z.boolean(),
  notes: z.string().min(5, 'Review notes required'),
});

export const processDamageClaimPaymentSchema = z.object({
  claim_id: z.string().uuid('Invalid claim ID'),
  payment_amount: z.number().positive('Payment amount must be positive'),
  payment_method: z.enum(['stripe', 'bank_transfer', 'credit_card']),
  payment_date: z.string().datetime(),
});

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

export const providerProtectionSettingsSchema = z.object({
  require_verified_users: z.boolean().optional(),
  minimum_reputation_score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),
  require_references: z.boolean().optional(),
  auto_require_deposit: z.boolean().optional(),
  deposit_amount: z.number().positive().optional(),
  require_payment_upfront: z.boolean().optional(),
  require_booking_approval: z.boolean().optional(),
  auto_approve_returning_users: z.boolean().optional(),
  message_filter_enabled: z.boolean().optional(),
  block_unverified_messages: z.boolean().optional(),
  strict_cancellation_enabled: z.boolean().optional(),
  cancellation_penalty_percent: z.number().min(0).max(100).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type UnblockUserInput = z.infer<typeof unblockUserSchema>;
export type RequestUnblockInput = z.infer<typeof requestUnblockSchema>;
export type RequestDepositInput = z.infer<typeof requestDepositSchema>;
export type FileComplaintInput = z.infer<typeof fileComplaintSchema>;
export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;
export type FileDamageClaimInput = z.infer<typeof fileDamageClaimSchema>;
export type ReviewDamageClaimInput = z.infer<typeof reviewDamageClaimSchema>;
export type ProviderProtectionSettingsInput = z.infer<
  typeof providerProtectionSettingsSchema
>;
