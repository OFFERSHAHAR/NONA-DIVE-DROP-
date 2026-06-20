/**
 * Authentication & Authorization Middleware
 * Protects routes and enforces permissions at the application level
 */

import { createClient } from '@/lib/supabase/server';
import { ResourceAction, UserRole, hasPermission } from './permissions';
import type { User } from '@supabase/supabase-js';

export interface AuthContext {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
}

/**
 * Get authentication context
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      user,
      role: user ? UserRole.REGISTERED : UserRole.ANONYMOUS,
      isAuthenticated: !!user,
    };
  } catch {
    return {
      user: null,
      role: UserRole.ANONYMOUS,
      isAuthenticated: false,
    };
  }
}

/**
 * Authorization check - throws error if not authorized
 */
export function authorize(context: AuthContext, action: ResourceAction): void {
  if (!hasPermission(context.role, action)) {
    throw new UnauthorizedError(
      `Action ${action} is not permitted for role ${context.role}`
    );
  }
}

/**
 * Assert user is authenticated
 */
export function requireAuth(context: AuthContext): User {
  if (!context.user || !context.isAuthenticated) {
    throw new AuthenticationError('User must be authenticated');
  }
  return context.user;
}

/**
 * Assert user owns a resource
 */
export function requireOwnership(userId: string | undefined, ownerId: string): void {
  if (userId !== ownerId) {
    throw new ForbiddenError('User does not own this resource');
  }
}

/**
 * Get user's role with their listings
 */
export async function getUserRoleWithListings(
  userId: string
): Promise<{ role: UserRole; hasListings: boolean }> {
  const supabase = await createClient();

  try {
    const { data: listings } = await supabase
      .from('listings')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    return {
      role: UserRole.REGISTERED,
      hasListings: (listings?.length ?? 0) > 0,
    };
  } catch {
    return {
      role: UserRole.REGISTERED,
      hasListings: false,
    };
  }
}

/**
 * Check if user can reveal contact to another user
 */
export async function canRevealContact(
  revealerId: string,
  recipientId: string,
  listingId: string
): Promise<boolean> {
  if (revealerId === recipientId) {
    return false; // Can't reveal to yourself
  }

  const supabase = await createClient();

  try {
    // Check if an interest exists (either direction)
    const { data: interest } = await supabase
      .from('interests')
      .select('id')
      .or(
        `and(listing_id.eq.${listingId},interested_user_id.eq.${revealerId}),and(listing_id.eq.${listingId},interested_user_id.eq.${recipientId})`
      )
      .single();

    return !!interest;
  } catch {
    return false;
  }
}

/**
 * Record contact reveal in audit log
 */
export async function auditContactReveal(
  userId: string,
  targetUserId: string,
  listingId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient();

  try {
    await supabase.from('audit_log').insert({
      actor_id: userId,
      action: 'contact_revealed',
      resource_type: 'contact',
      resource_id: targetUserId,
      target_user_id: targetUserId,
      details: { listing_id: listingId },
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Audit log failed:', error);
    // Don't throw - audit logging shouldn't break the app
  }
}

/**
 * Record user block in audit log
 */
export async function auditUserBlock(
  blockerId: string,
  blockedUserId: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient();

  try {
    await supabase.from('audit_log').insert({
      actor_id: blockerId,
      action: 'user_blocked',
      resource_type: 'user',
      resource_id: blockedUserId,
      target_user_id: blockedUserId,
      details: { reason },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

/**
 * Record listing creation in audit log
 */
export async function auditListingCreation(
  userId: string,
  listingId: string,
  title: string
): Promise<void> {
  const supabase = await createClient();

  try {
    await supabase.from('audit_log').insert({
      actor_id: userId,
      action: 'listing_created',
      resource_type: 'listing',
      resource_id: listingId,
      details: { title },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

/**
 * Custom error classes
 */

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class UnauthorizedError extends AuthorizationError {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthorizationError {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
