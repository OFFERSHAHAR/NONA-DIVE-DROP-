/**
 * User Blocking Service
 *
 * Allows users to block others from:
 * - Seeing their listings
 * - Contacting them
 * - Viewing their profile
 */

import { createClient } from '@/lib/supabase/server';
import { requireAuth, auditUserBlock } from './auth-middleware';
import type { AuthContext } from './auth-middleware';

export interface BlockRecord {
  id: string;
  blockerId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: string;
}

/**
 * Block a user
 *
 * After blocking:
 * - Blocked user can't see your listings
 * - Blocked user can't send you interest requests
 * - Blocked user can't contact you
 * - Existing interests/reveals are removed
 */
export async function blockUser(
  context: AuthContext,
  blockedUserId: string,
  reason?: string
): Promise<BlockRecord> {
  const user = requireAuth(context);

  if (user.id === blockedUserId) {
    throw new Error('Cannot block yourself');
  }

  const supabase = await createClient();

  try {
    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_user_id', blockedUserId)
      .single();

    if (existing) {
      throw new Error('User is already blocked');
    }

    // Create block record
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .insert({
        blocker_id: user.id,
        blocked_user_id: blockedUserId,
        reason,
      })
      .select()
      .single();

    if (blockError || !block) {
      throw blockError || new Error('Failed to block user');
    }

    // Remove any existing interests from blocked user to your listings
    await supabase
      .from('interests')
      .delete()
      .eq('interested_user_id', blockedUserId)
      .in(
        'listing_id',
        (
          await supabase
            .from('listings')
            .select('id')
            .eq('owner_id', user.id)
        ).data?.map((l) => l.id) || []
      );

    // Remove any contact reveals involving blocked user
    await supabase
      .from('contact_reveals')
      .delete()
      .or(
        `initiator_id.eq.${blockedUserId},recipient_id.eq.${blockedUserId}`
      );

    // Audit log
    await auditUserBlock(user.id, blockedUserId, reason);

    return {
      id: block.id,
      blockerId: block.blocker_id,
      blockedUserId: block.blocked_user_id,
      reason: block.reason,
      createdAt: block.created_at,
    };
  } catch (error) {
    console.error('Block user failed:', error);
    throw error;
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(
  context: AuthContext,
  blockedUserId: string
): Promise<void> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_user_id', blockedUserId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Unblock user failed:', error);
    throw error;
  }
}

/**
 * Get list of users blocked by current user
 */
export async function getBlockedUsers(
  context: AuthContext
): Promise<BlockRecord[]> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    const { data: blocks, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (blocks || []).map((b) => ({
      id: b.id,
      blockerId: b.blocker_id,
      blockedUserId: b.blocked_user_id,
      reason: b.reason,
      createdAt: b.created_at,
    }));
  } catch (error) {
    console.error('Get blocked users failed:', error);
    return [];
  }
}

/**
 * Check if user is blocked
 */
export async function isUserBlocked(
  blockerId: string,
  potentialBlockedUserId: string
): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_user_id', potentialBlockedUserId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Check if current user has blocked another user
 */
export async function hasBlocked(
  context: AuthContext,
  otherUserId: string
): Promise<boolean> {
  const user = requireAuth(context);

  return isUserBlocked(user.id, otherUserId);
}
