import { z } from 'zod';

// ============================================================================
// EQUIPMENT SCHEMAS
// ============================================================================

export const equipmentStatusEnum = z.enum([
  'available',
  'unavailable',
  'missing',
  'damaged',
  'returned_damaged',
  'returned_ok'
]);

export type EquipmentStatus = z.infer<typeof equipmentStatusEnum>;

export const equipmentCreateSchema = z.object({
  name: z.string().min(3, 'Equipment name must be at least 3 characters').max(255),
  description: z.string().optional(),
  equipment_type: z.string().min(1, 'Equipment type is required'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  rental_price_per_day: z.number().positive('Price must be greater than 0'),
  currency: z.string().default('ILS'),
  location_name: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  condition_rating: z.number().int().min(1).max(5).optional(),
  photo_urls: z.array(z.string().url()).optional()
});

export type EquipmentCreate = z.infer<typeof equipmentCreateSchema>;

export const equipmentUpdateSchema = equipmentCreateSchema.partial();

export type EquipmentUpdate = z.infer<typeof equipmentUpdateSchema>;

export const equipmentStatusUpdateSchema = z.object({
  status: equipmentStatusEnum,
  reason: z.string().optional(),
  notes: z.string().optional()
});

export type EquipmentStatusUpdate = z.infer<typeof equipmentStatusUpdateSchema>;

// ============================================================================
// DAMAGE REPORT SCHEMAS
// ============================================================================

export const damageTypeEnum = z.enum(['minor', 'moderate', 'severe']);

export type DamageType = z.infer<typeof damageTypeEnum>;

export const damageReportStatusEnum = z.enum([
  'pending_review',
  'approved',
  'rejected',
  'resolved'
]);

export type DamageReportStatus = z.infer<typeof damageReportStatusEnum>;

export const damageReportCreateSchema = z.object({
  equipment_id: z.string().uuid('Invalid equipment ID'),
  rental_id: z.string().uuid().optional().nullable(),
  report_role: z.enum(['renter', 'lister']),
  damage_type: damageTypeEnum,
  description: z.string().min(10, 'Description must be at least 10 characters'),
  damage_photos: z.array(z.string().url()).optional(),
  repair_cost_estimate: z.number().positive().optional()
});

export type DamageReportCreate = z.infer<typeof damageReportCreateSchema>;

export const damageReportResponseSchema = z.object({
  damage_report_id: z.string().uuid(),
  lister_response: z.string().min(10, 'Response must be at least 10 characters'),
  repair_cost_actual: z.number().positive().optional(),
  status: z.enum(['approved', 'rejected'])
});

export type DamageReportResponse = z.infer<typeof damageReportResponseSchema>;

// ============================================================================
// PROBLEMATIC USER SCHEMAS
// ============================================================================

export const problematicReasonEnum = z.enum([
  'equipment_damage',
  'non_payment',
  'theft',
  'harassment',
  'fraud',
  'safety_violation',
  'other'
]);

export type ProblematicReason = z.infer<typeof problematicReasonEnum>;

export const blacklistLevelEnum = z.enum(['warning', 'restricted', 'banned']);

export type BlacklistLevel = z.infer<typeof blacklistLevelEnum>;

export const problematicUserCreateSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  reason: problematicReasonEnum,
  related_rental_id: z.string().uuid().optional().nullable(),
  related_damage_report_id: z.string().uuid().optional().nullable(),
  blacklist_level: blacklistLevelEnum.default('warning'),
  description: z.string().min(10, 'Description required')
});

export type ProblematicUserCreate = z.infer<typeof problematicUserCreateSchema>;

// ============================================================================
// LISTER WARNING SCHEMAS
// ============================================================================

export const warningLevelEnum = z.enum(['caution', 'warning', 'critical']);

export type WarningLevel = z.infer<typeof warningLevelEnum>;

export const listerWarningSchema = z.object({
  warning_level: warningLevelEnum,
  reason: z.string().min(10)
});

export type ListerWarning = z.infer<typeof listerWarningSchema>;

// ============================================================================
// QUERY FILTERS SCHEMAS
// ============================================================================

export const equipmentFilterSchema = z.object({
  status: equipmentStatusEnum.optional(),
  equipment_type: z.string().optional(),
  condition_rating_min: z.number().int().min(1).max(5).optional(),
  location_name: z.string().optional(),
  lister_id: z.string().uuid().optional(),
  sort_by: z.enum(['created_at', 'price', 'rating']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type EquipmentFilter = z.infer<typeof equipmentFilterSchema>;

export const damageReportFilterSchema = z.object({
  status: damageReportStatusEnum.optional(),
  damage_type: damageTypeEnum.optional(),
  equipment_id: z.string().uuid().optional(),
  lister_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
});

export type DamageReportFilter = z.infer<typeof damageReportFilterSchema>;

export const problematicUserFilterSchema = z.object({
  blacklist_level: blacklistLevelEnum.optional(),
  reason: problematicReasonEnum.optional(),
  is_resolved: z.boolean().optional()
});

export type ProblematicUserFilter = z.infer<typeof problematicUserFilterSchema>;

// ============================================================================
// STUB SCHEMAS FOR INCOMPLETE API ROUTES
// ============================================================================
// These schemas are imported by in-progress API routes but not yet fully implemented.

export const createEquipmentListingSchema = equipmentCreateSchema;
export type CreateEquipmentListing = EquipmentCreate;

export const searchEquipmentListingsSchema = equipmentFilterSchema.extend({
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  max_distance_km: z.number().default(50),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort_by: z.string().default('newest'),
});

export const myEquipmentListingsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  sort_by: z.string().optional(),
});

export const myRentalsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  sort_by: z.string().optional(),
});

export const requestEquipmentRentalSchema = z.object({
  equipment_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  notes: z.string().optional(),
});

export const validateRentalDates = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end && start > new Date();
};

export const approveEquipmentRentalSchema = z.object({
  rental_id: z.string().uuid(),
  rental_start_date: z.string().datetime(),
  rental_end_date: z.string().datetime(),
});

export const returnEquipmentSchema = z.object({
  rental_id: z.string().uuid(),
  condition: z.string().optional(),
  notes: z.string().optional(),
});

export const createEquipmentReviewSchema = z.object({
  equipment_id: z.string().uuid(),
  rental_id: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(5),
  comment: z.string().min(10),
});
