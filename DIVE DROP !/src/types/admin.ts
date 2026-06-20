/**
 * Admin Panel TypeScript Types
 * Generated from DIVE DROP admin database schema
 * Created: 2026-06-20
 */

// ============================================================================
// ADMIN ROLES AND PERMISSIONS
// ============================================================================

export type AdminRoleName =
  | 'super_admin'
  | 'site_manager'
  | 'shuttle_manager'
  | 'user_admin'
  | 'content_moderator'
  | 'auditor'
  | 'viewer';

export type AdminPermissionResource =
  | 'users'
  | 'dive_sites'
  | 'shuttles'
  | 'profiles'
  | 'reviews'
  | 'audit_logs'
  | 'admin_users'
  | 'reports';

export type AdminPermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export';

export interface AdminRole {
  id: string;
  name: AdminRoleName;
  display_name_en: string;
  display_name_he: string;
  description: string;
  priority: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AdminPermission {
  id: string;
  name: string;
  description: string;
  resource: AdminPermissionResource;
  action: AdminPermissionAction;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

// ============================================================================
// ADMIN USERS
// ============================================================================

export interface AdminUser {
  id: string;
  user_id: string;
  role_id: string;
  is_active: boolean;
  activated_at: string;
  deactivated_at: string | null;
  last_login_at: string | null;
  login_count: number;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined relations
  role?: AdminRole;
  user?: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface CreateAdminUserInput {
  user_id: string;
  role_id: string;
  notes?: string;
}

export interface UpdateAdminUserInput {
  role_id?: string;
  is_active?: boolean;
  notes?: string;
}

// ============================================================================
// DIVE SITES ENHANCED
// ============================================================================

export type DiveSiteModerationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_revision';

export interface DiveSitesEnhanced {
  dive_site_id: string;
  moderation_status: DiveSiteModerationStatus;
  featured: boolean;
  published: boolean;
  view_count: number;
  booking_count: number;
  moderation_notes: string;
  last_moderated_by: string | null;
  last_moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DIVE SITE IMAGES
// ============================================================================

export type ImageModerationStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export interface DiveSiteImage {
  id: string;
  dive_site_id: string;
  image_url: string;
  image_storage_path: string;
  alt_text_en: string;
  alt_text_he: string;
  order_index: number;
  is_primary: boolean;
  uploaded_by: string | null;
  moderation_status: ImageModerationStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UploadDiveSiteImageInput {
  dive_site_id: string;
  image_url: string;
  image_storage_path: string;
  alt_text_en?: string;
  alt_text_he?: string;
  order_index?: number;
  is_primary?: boolean;
}

// ============================================================================
// SHUTTLES
// ============================================================================

export type ShuttleType = 'boat' | 'van' | 'bus' | 'other';
export type ShuttleFrequency = 'daily' | 'weekly' | 'custom';

export interface Shuttle {
  id: string;
  name: string;
  description: string;
  type: ShuttleType;
  capacity: number;
  current_occupancy: number;
  departure_location: string;
  departure_latitude: number;
  departure_longitude: number;
  destination_dive_site_id: string | null;
  departure_time: string; // HH:MM format
  return_time: string; // HH:MM format
  duration_minutes: number;
  frequency: ShuttleFrequency;
  operating_days: string; // 'Mo,Tu,We,Th,Fr,Sa,Su'
  price_per_person: number;
  currency: string;
  is_active: boolean;
  is_full: boolean;
  amenities: string[];
  equipment_provided: string[];
  notes: string;
  contact_phone: string;
  contact_email: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateShuttleInput {
  name: string;
  description?: string;
  type: ShuttleType;
  capacity: number;
  departure_location: string;
  departure_latitude: number;
  departure_longitude: number;
  destination_dive_site_id?: string;
  departure_time: string;
  return_time: string;
  duration_minutes: number;
  frequency: ShuttleFrequency;
  operating_days?: string;
  price_per_person: number;
  currency?: string;
  amenities?: string[];
  equipment_provided?: string[];
  notes?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface UpdateShuttleInput {
  name?: string;
  description?: string;
  capacity?: number;
  departure_location?: string;
  departure_latitude?: number;
  departure_longitude?: number;
  destination_dive_site_id?: string | null;
  departure_time?: string;
  return_time?: string;
  duration_minutes?: number;
  frequency?: ShuttleFrequency;
  operating_days?: string;
  price_per_person?: number;
  is_active?: boolean;
  amenities?: string[];
  equipment_provided?: string[];
  notes?: string;
  contact_phone?: string;
  contact_email?: string;
}

// ============================================================================
// SHUTTLE SCHEDULES
// ============================================================================

export type ShuttleScheduleStatus =
  | 'scheduled'
  | 'confirmed'
  | 'boarding'
  | 'departed'
  | 'returned'
  | 'cancelled';

export interface ShuttleSchedule {
  id: string;
  shuttle_id: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_departure: string; // ISO timestamp
  scheduled_return: string; // ISO timestamp
  status: ShuttleScheduleStatus;
  current_occupancy: number;
  is_full: boolean;
  notes: string;
  captain_name: string;
  weather_forecast: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_reason: string;
}

export interface CreateShuttleScheduleInput {
  shuttle_id: string;
  scheduled_date: string;
  scheduled_departure: string;
  scheduled_return: string;
  notes?: string;
  captain_name?: string;
  weather_forecast?: string;
}

export interface UpdateShuttleScheduleInput {
  status?: ShuttleScheduleStatus;
  notes?: string;
  captain_name?: string;
  weather_forecast?: string;
  cancelled_reason?: string;
}

// ============================================================================
// SHUTTLE BOOKINGS
// ============================================================================

export type ShuttleBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface ShuttleBooking {
  id: string;
  shuttle_schedule_id: string;
  user_id: string;
  number_of_persons: number;
  total_price: number;
  status: ShuttleBookingStatus;
  confirmed_at: string | null;
  cancelled_at: string | null;
  payment_status: PaymentStatus;
  payment_method: string;
  transaction_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  special_requests: string;
  dietary_restrictions: string;
  medical_notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined relations
  shuttle_schedule?: ShuttleSchedule;
  shuttle?: Shuttle;
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface CreateShuttleBookingInput {
  shuttle_schedule_id: string;
  number_of_persons: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  special_requests?: string;
  dietary_restrictions?: string;
  medical_notes?: string;
}

export interface UpdateShuttleBookingInput {
  status?: ShuttleBookingStatus;
  payment_status?: PaymentStatus;
  payment_method?: string;
  transaction_id?: string;
  special_requests?: string;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export type AuditLogStatus = 'success' | 'failure' | 'partial';

export interface AuditLog {
  id: string;
  admin_user_id: string | null;
  action: string;
  resource_type: AdminPermissionResource;
  resource_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string;
  status: AuditLogStatus;
  error_message: string;
  created_at: string;

  // Joined relations
  admin_user?: AdminUser;
}

export interface AuditLogQuery {
  resource_type?: AdminPermissionResource;
  action?: string;
  admin_user_id?: string;
  status?: AuditLogStatus;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  action: string;
  resource_type: string;
  count: number;
  last_action: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ShuttleAvailability {
  available_seats: number;
  total_bookings: number;
  is_available: boolean;
}

export interface AdminStats {
  total_admins: number;
  total_active_admins: number;
  admins_by_role: Record<AdminRoleName, number>;
  recent_actions: AuditLog[];
  failed_actions_today: number;
}

export interface ShuttleStats {
  total_shuttles: number;
  active_shuttles: number;
  total_capacity: number;
  total_booked: number;
  occupancy_rate: number;
  upcoming_schedules: ShuttleSchedule[];
}

export interface DiveSiteStats {
  total_sites: number;
  published_sites: number;
  featured_sites: number;
  pending_moderation: number;
  total_images: number;
}

// ============================================================================
// CONTEXT AND HOOKS TYPES
// ============================================================================

export interface AdminContextType {
  user: AdminUser | null;
  role: AdminRole | null;
  permissions: Set<string>;
  isLoading: boolean;
  isAdmin: boolean;
  canAccess: (resource: AdminPermissionResource, action: AdminPermissionAction) => boolean;
  logout: () => Promise<void>;
}

export interface UseAdminPermissionOptions {
  resource: AdminPermissionResource;
  action: AdminPermissionAction;
  fallback?: React.ReactNode;
}

// ============================================================================
// FORM VALIDATION TYPES
// ============================================================================

export interface ShuttleFormData {
  name: string;
  type: ShuttleType;
  capacity: number;
  departure_location: string;
  departure_latitude: number;
  departure_longitude: number;
  departure_time: string;
  return_time: string;
  price_per_person: number;
}

export interface AdminUserFormData {
  user_id: string;
  role_id: string;
  notes: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AdminTableName =
  | 'admin_users'
  | 'admin_roles'
  | 'admin_permissions'
  | 'shuttles'
  | 'shuttle_schedules'
  | 'shuttle_bookings'
  | 'dive_sites_enhanced'
  | 'dive_site_images'
  | 'audit_logs';

export interface PageParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
