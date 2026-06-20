/**
 * TypeScript Type Definitions for Security System
 * Comprehensive type safety for auth, permissions, and privacy controls
 */

import type { User } from '@supabase/supabase-js';
import { UserRole, ResourceAction, VisibilityLevel } from './permissions';

/**
 * Authentication Context
 * Passed to all auth checks
 */
export interface AuthContext {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  sessionId?: string;
  expiresAt?: Date;
}

/**
 * User Profile (Public)
 * What's visible to other registered users
 */
export interface UserProfilePublic {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  divingExperience: 'beginner' | 'intermediate' | 'advanced' | 'instructor';
  location?: string; // General location, not full address
  createdAt: Date;
}

/**
 * User Profile (Complete)
 * All user data including contact info
 */
export interface UserProfileComplete extends UserProfilePublic {
  email: string;
  phone?: string;
  profilePictureUrl?: string;
  location?: string; // Full address for owner
  blockedUsers: string[]; // Array of blocked user IDs
  updatedAt: Date;
}

/**
 * Visible User Contact Info
 * Only shown after mutual contact reveal
 */
export interface ContactInfo {
  email: string;
  phone?: string;
  profilePictureUrl?: string;
}

/**
 * Listing (Public View)
 * What anonymous/registered users see
 */
export interface ListingPublic {
  id: string;
  title: string;
  description: string;
  divingLevel: 'beginner' | 'intermediate' | 'advanced';
  location: string;
  diveDate: Date;
  ownerName: string; // First name only
  ownerId: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Listing (Owner View)
 * What the listing owner sees
 */
export interface ListingOwner extends ListingPublic {
  ownerId: string; // Full ID visible to owner
  ownerEmail: string; // Email visible to owner
  maxBuddies: number;
  isActive: boolean;
  interestedUsers: InterestRecord[]; // Users interested
  contactRevealRequests: ContactReveal[]; // Pending reveals
}

/**
 * Listing (Database)
 * Internal database representation
 */
export interface ListingDB {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  diving_level: string;
  location: string;
  dive_date: string; // ISO 8601
  max_buddies: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Interest Record
 * When User B expresses interest in User A's listing
 */
export interface InterestRecord {
  id: string;
  listingId: string;
  interestedUserId: string;
  interestedUserName: string; // For owner to see
  listingOwnerId: string;
  createdAt: Date;
}

/**
 * Contact Reveal Record
 * Tracks mutual contact info reveals
 */
export interface ContactReveal {
  id: string;
  listingId: string;
  initiatorId: string;
  recipientId: string;
  initiatorContactRevealed: boolean; // User B revealed
  recipientContactRevealed: boolean; // User A revealed
  mutualRevealedAt?: Date; // When both revealed
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact Reveal Response
 * What initiator sees when requesting
 */
export interface ContactRevealRequest {
  id: string;
  listingId: string;
  initiatorName: string;
  initiatorProfilePic?: string;
  initiatorEmail?: string; // If already revealed
  message: string; // "User X wants to connect"
  requestedAt: Date;
}

/**
 * Block Record
 * When User A blocks User B
 */
export interface BlockRecord {
  id: string;
  blockerId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: Date;
}

/**
 * Report Record
 * Abuse/spam reports
 */
export interface ReportRecord {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedListingId?: string;
  reason: 'spam' | 'abuse' | 'inappropriate' | 'other';
  description?: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Audit Log Entry
 * Immutable record of sensitive actions
 */
export interface AuditLogEntry {
  id: string;
  actorId: string;
  action:
    | 'contact_revealed'
    | 'contact_requested'
    | 'user_blocked'
    | 'user_reported'
    | 'listing_created'
    | 'listing_deleted'
    | 'interest_expressed';
  resourceType: 'user' | 'listing' | 'contact';
  resourceId: string;
  targetUserId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Permission Check Result
 * Result of permission validation
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
  currentRole?: UserRole;
}

/**
 * Visibility Context
 * Determines what a viewer can see
 */
export interface VisibilityContext {
  viewerId: string | null;
  viewerRole: UserRole;
  ownerId: string;
  hasBlocked: boolean;
  isMutualReveal: boolean;
}

/**
 * Field Visibility Map
 * For rendering views conditionally
 */
export interface FieldVisibilityMap {
  [fieldName: string]: boolean;
}

/**
 * Server Action Response
 * Standard response format for all server actions
 */
export interface ServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string; // Error code for i18n
}

/**
 * Authorization Context for Actions
 * Full context needed for authorization checks
 */
export interface AuthorizationContext {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  userId?: string;
  permissions: Set<ResourceAction>;
}

/**
 * Notification Type
 * For future notification system
 */
export interface Notification {
  id: string;
  recipientId: string;
  type:
    | 'interest_expressed'
    | 'contact_reveal_requested'
    | 'contact_reveal_accepted'
    | 'contact_reveal_declined'
    | 'user_blocked'
    | 'report_submitted';
  relatedUserId?: string;
  relatedListingId?: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Search Filter
 * For listing search with permission checks
 */
export interface ListingSearchFilter {
  divingLevel?: 'beginner' | 'intermediate' | 'advanced';
  location?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  maxDistance?: number; // km
  excludeBlocked?: boolean; // Hide listings from blocked users
  onlyActive?: boolean;
}

/**
 * Privacy Settings (User)
 * User preferences for privacy controls
 */
export interface UserPrivacySettings {
  userId: string;
  allowAnonymousToSeeListings: boolean; // Always true for now
  allowRegisteredToContact: boolean;
  autoBlockSpammers: boolean;
  allowProfileIndexing: boolean;
  allowLocationTracking: boolean;
  notifyOnInterest: boolean;
  notifyOnContactReveal: boolean;
  updatedAt: Date;
}

/**
 * Error types
 */
export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string = 'SECURITY_ERROR'
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class AuthenticationError extends SecurityError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_REQUIRED');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends SecurityError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(message, code);
    this.name = 'AuthorizationError';
  }
}

export class ForbiddenError extends AuthorizationError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class OwnershipError extends ForbiddenError {
  constructor(message: string = 'You do not own this resource') {
    super(message);
    this.name = 'OwnershipError';
  }
}

/**
 * API Response Types
 */
export namespace API {
  export interface ListingResponse extends ServerActionResponse<ListingPublic> {}
  export interface ListingsResponse extends ServerActionResponse<ListingPublic[]> {}
  export interface ContactInfoResponse extends ServerActionResponse<ContactInfo> {}
  export interface ContactRevealResponse extends ServerActionResponse<ContactReveal> {}
  export interface BlockResponse extends ServerActionResponse<BlockRecord> {}
  export interface ReportResponse extends ServerActionResponse<ReportRecord> {}
  export interface AuditLogResponse extends ServerActionResponse<AuditLogEntry[]> {}
}

/**
 * Query Parameters
 */
export interface ListingsQueryParams {
  page?: number;
  limit?: number;
  divingLevel?: string;
  location?: string;
  sortBy?: 'recent' | 'popular' | 'closest';
}

/**
 * Form Input Types
 */
export interface CreateListingInput {
  title: string;
  description: string;
  divingLevel: 'beginner' | 'intermediate' | 'advanced';
  location: string;
  diveDate: string; // ISO 8601
  maxBuddies: number;
  imageUrl?: string;
}

export interface ContactRevealInput {
  listingId: string;
}

export interface BlockUserInput {
  blockedUserId: string;
  reason?: string;
}

export interface ReportInput {
  reportedUserId?: string;
  reportedListingId?: string;
  reason: 'spam' | 'abuse' | 'inappropriate' | 'other';
  description?: string;
}
