/**
 * User Blocking & Deposit Protection Service
 * Handles blocking, deposit requirements, and enforcement
 */

import { createClient } from '@/lib/supabase/server';
import {
  UserBlock,
  DepositRequirement,
  BlockUserRequest,
  RequestDepositRequest,
} from '@/types/protection';

export class BlockingService {
  private supabase = createClient();

  /**
   * Block a user from booking with a provider/instructor
   */
  async blockUser(
    blockingUserId: string,
    userType: 'instructor' | 'lister' | 'provider',
    request: BlockUserRequest
  ): Promise<UserBlock> {
    // Check if already blocked
    const { data: existing } = await this.supabase
      .from('user_blocks')
      .select('*')
      .eq('blocked_user_id', request.blocked_user_id)
      .eq('blocking_user_id', blockingUserId)
      .single();

    if (existing) {
      throw new Error('User is already blocked');
    }

    // Calculate expiry if temporary
    let expiresAt = null;
    if (request.temporary && request.expires_in_days) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + request.expires_in_days);
      expiresAt = expiry.toISOString();
    }

    const { data, error } = await this.supabase
      .from('user_blocks')
      .insert({
        blocked_user_id: request.blocked_user_id,
        blocking_user_id: blockingUserId,
        user_type: userType,
        reason: request.reason,
        created_reason_category: request.reason_category,
        can_book_services: false,
        can_send_messages: false,
        can_view_contact: false,
        is_active: true,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockingUserId: string, blockedUserId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_blocks')
      .update({ is_active: false })
      .eq('blocked_user_id', blockedUserId)
      .eq('blocking_user_id', blockingUserId);

    if (error) throw error;
  }

  /**
   * Request unblock (user initiates appeal)
   */
  async requestUnblock(
    blockedUserId: string,
    blockingUserId: string,
    reason: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('user_blocks')
      .update({
        unblock_requested: true,
        unblock_reason: reason,
        unblock_requested_at: new Date().toISOString(),
      })
      .eq('blocked_user_id', blockedUserId)
      .eq('blocking_user_id', blockingUserId);

    if (error) throw error;
  }

  /**
   * Check if user is blocked
   */
  async isUserBlocked(
    blockingUserId: string,
    blockedUserId: string
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_blocks')
      .select('*')
      .eq('blocked_user_id', blockedUserId)
      .eq('blocking_user_id', blockingUserId)
      .eq('is_active', true)
      .single();

    if (!data) return false;

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // Auto-unblock
      await this.unblockUser(blockingUserId, blockedUserId);
      return false;
    }

    return true;
  }

  /**
   * Get all users blocked by a provider
   */
  async getBlockedUsers(blockingUserId: string): Promise<UserBlock[]> {
    const { data, error } = await this.supabase
      .from('user_blocks')
      .select('*')
      .eq('blocking_user_id', blockingUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out expired blocks
    return (data || []).filter((block) => {
      if (block.expires_at && new Date(block.expires_at) < new Date()) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get all blocks on a specific user (as blocked user)
   */
  async getBlocksAgainstUser(userId: string): Promise<UserBlock[]> {
    const { data, error } = await this.supabase
      .from('user_blocks')
      .select('*')
      .eq('blocked_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Request deposit from user
   */
  async requestDeposit(
    providerId: string,
    request: RequestDepositRequest
  ): Promise<DepositRequirement> {
    // Check if deposit already requested
    const { data: existing } = await this.supabase
      .from('deposit_requirements')
      .select('*')
      .eq('user_id', request.user_id)
      .eq('requiring_user_id', providerId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      throw new Error('Deposit already requested from this user');
    }

    const { data, error } = await this.supabase
      .from('deposit_requirements')
      .insert({
        requiring_user_id: providerId,
        user_id: request.user_id,
        requirement_type: request.requirement_type,
        amount_required: request.amount,
        currency: 'ILS', // Default to ILS
        status: 'pending',
        related_booking_id: request.related_booking_id,
        reason: request.reason,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get pending deposit requirements for a user
   */
  async getPendingDeposits(userId: string): Promise<DepositRequirement[]> {
    const { data, error } = await this.supabase
      .from('deposit_requirements')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Mark deposit as confirmed (payment received)
   */
  async confirmDepositPayment(
    depositId: string,
    stripeChargeId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('deposit_requirements')
      .update({
        status: 'confirmed',
        payment_received_at: new Date().toISOString(),
        stripe_charge_id: stripeChargeId,
      })
      .eq('id', depositId);

    if (error) throw error;
  }

  /**
   * Claim deposit (as provider - for damage)
   */
  async claimDeposit(depositId: string, description: string): Promise<void> {
    const { error } = await this.supabase
      .from('deposit_requirements')
      .update({
        status: 'claimed',
        claim_date: new Date().toISOString(),
        claim_description: description,
      })
      .eq('id', depositId);

    if (error) throw error;
  }

  /**
   * Refund deposit
   */
  async refundDeposit(depositId: string, refundAmount?: number): Promise<void> {
    const { data: deposit } = await this.supabase
      .from('deposit_requirements')
      .select('amount_required')
      .eq('id', depositId)
      .single();

    const refundAmt = refundAmount || deposit?.amount_required || 0;

    const { error } = await this.supabase
      .from('deposit_requirements')
      .update({
        status: 'refunded',
        refund_date: new Date().toISOString(),
        refund_amount: refundAmt,
      })
      .eq('id', depositId);

    if (error) throw error;
  }

  /**
   * Get deposit requirements issued by a provider
   */
  async getIssuedDeposits(providerId: string): Promise<DepositRequirement[]> {
    const { data, error } = await this.supabase
      .from('deposit_requirements')
      .select('*')
      .eq('requiring_user_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if user can interact with provider
   */
  async canUserInteractWithProvider(
    userId: string,
    providerId: string
  ): Promise<{ canBook: boolean; canMessage: boolean; reason?: string }> {
    // Check if blocked
    const isBlocked = await this.isUserBlocked(providerId, userId);
    if (isBlocked) {
      return {
        canBook: false,
        canMessage: false,
        reason: 'You have been blocked by this provider',
      };
    }

    // Check pending deposits
    const pendingDeposits = await this.getPendingDeposits(userId);
    if (pendingDeposits.length > 0) {
      const unpaidDeposits = pendingDeposits.filter((d) => d.status === 'pending');
      if (unpaidDeposits.length > 0) {
        return {
          canBook: false,
          canMessage: true,
          reason: `You have ${unpaidDeposits.length} pending deposit(s) to pay`,
        };
      }
    }

    return { canBook: true, canMessage: true };
  }
}
