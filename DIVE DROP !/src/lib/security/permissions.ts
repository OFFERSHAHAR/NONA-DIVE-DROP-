import { z } from 'zod';

/**
 * Permission Matrix for "Find a Buddy" (מצא באדי)
 *
 * User roles and what they can access/perform
 */

export enum UserRole {
  ANONYMOUS = 'anonymous',      // Not logged in
  REGISTERED = 'registered',     // Verified email, can view listings
  LISTING_OWNER = 'listing_owner', // Can manage their own listings
}

export enum ResourceAction {
  // Listing actions
  VIEW_LISTING = 'view_listing',
  CREATE_LISTING = 'create_listing',
  UPDATE_LISTING = 'update_listing',
  DELETE_LISTING = 'delete_listing',

  // Contact info actions
  VIEW_CONTACT_INFO = 'view_contact_info',
  REVEAL_CONTACT = 'reveal_contact',
  REQUEST_CONTACT = 'request_contact',

  // User actions
  VIEW_PROFILE = 'view_profile',
  BLOCK_USER = 'block_user',
  REPORT_USER = 'report_user',
  UNBLOCK_USER = 'unblock_user',

  // Interest actions
  EXPRESS_INTEREST = 'express_interest',
  VIEW_INTEREST = 'view_interest',
}

/**
 * Permission Matrix
 * Defines what each role can do with resources
 */
export const PERMISSION_MATRIX: Record<UserRole, Set<ResourceAction>> = {
  [UserRole.ANONYMOUS]: new Set([
    // Anonymous users can view public listings (without contact info)
    ResourceAction.VIEW_LISTING,
  ]),

  [UserRole.REGISTERED]: new Set([
    // All anonymous permissions
    ResourceAction.VIEW_LISTING,
    // Plus registered user permissions
    ResourceAction.CREATE_LISTING,
    ResourceAction.EXPRESS_INTEREST,
    ResourceAction.VIEW_PROFILE,
    ResourceAction.BLOCK_USER,
    ResourceAction.REPORT_USER,
    ResourceAction.REQUEST_CONTACT,
  ]),

  [UserRole.LISTING_OWNER]: new Set([
    // All registered permissions
    ...PERMISSION_MATRIX[UserRole.REGISTERED],
    // Plus owner-specific permissions
    ResourceAction.UPDATE_LISTING,
    ResourceAction.DELETE_LISTING,
    ResourceAction.VIEW_CONTACT_INFO, // Can see who's interested
    ResourceAction.VIEW_INTEREST,
    ResourceAction.REVEAL_CONTACT,
  ]),
};

/**
 * Check if user role has permission for action
 */
export function hasPermission(role: UserRole, action: ResourceAction): boolean {
  return PERMISSION_MATRIX[role]?.has(action) ?? false;
}

/**
 * Visibility Rules for Listing Details
 * What fields are visible to different viewers
 */
export enum VisibilityLevel {
  PUBLIC = 'public',           // Everyone sees it
  AUTHENTICATED = 'authenticated', // Only registered users
  OWNER_ONLY = 'owner_only',   // Only the listing owner
  MUTUAL_REVEAL = 'mutual_reveal', // After both users reveal contact
}

export const LISTING_FIELD_VISIBILITY: Record<string, VisibilityLevel> = {
  // Public fields
  id: VisibilityLevel.PUBLIC,
  title: VisibilityLevel.PUBLIC,
  description: VisibilityLevel.PUBLIC,
  divingLevel: VisibilityLevel.PUBLIC,
  location: VisibilityLevel.PUBLIC,
  date: VisibilityLevel.PUBLIC,
  imageUrl: VisibilityLevel.PUBLIC,
  ownerId: VisibilityLevel.PUBLIC,
  ownerName: VisibilityLevel.PUBLIC,
  createdAt: VisibilityLevel.PUBLIC,

  // Contact info - only after mutual reveal
  ownerEmail: VisibilityLevel.MUTUAL_REVEAL,
  ownerPhone: VisibilityLevel.MUTUAL_REVEAL,
  ownerProfilePicture: VisibilityLevel.MUTUAL_REVEAL,

  // Owner only
  interestedUsers: VisibilityLevel.OWNER_ONLY,
};

/**
 * Check if viewer can see a field
 */
export function canSeeField(
  fieldName: string,
  viewerRole: UserRole,
  viewerUserId: string | null,
  ownerId: string,
  hasRevealed: boolean
): boolean {
  const visibility = LISTING_FIELD_VISIBILITY[fieldName] ?? VisibilityLevel.PUBLIC;

  switch (visibility) {
    case VisibilityLevel.PUBLIC:
      return true;

    case VisibilityLevel.AUTHENTICATED:
      return viewerRole !== UserRole.ANONYMOUS;

    case VisibilityLevel.OWNER_ONLY:
      return viewerUserId === ownerId;

    case VisibilityLevel.MUTUAL_REVEAL:
      return viewerRole !== UserRole.ANONYMOUS && hasRevealed;

    default:
      return false;
  }
}

/**
 * Resource ownership check
 */
export function isListingOwner(userId: string, listingOwnerId: string): boolean {
  return userId === listingOwnerId;
}

/**
 * Validation schemas for permissions
 */
export const permissionCheckSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(UserRole),
  action: z.nativeEnum(ResourceAction),
});

export type PermissionCheck = z.infer<typeof permissionCheckSchema>;
