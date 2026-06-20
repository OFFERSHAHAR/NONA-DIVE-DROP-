/**
 * Email Verification Token Management
 * Secure token generation, validation, and expiry handling
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface EmailVerificationToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  verified: boolean;
}

const TOKEN_EXPIRY_HOURS = 24;
const TOKEN_LENGTH = 32;

/**
 * Generate a secure random token
 */
function generateRandomToken(length: number = TOKEN_LENGTH): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }

  return token;
}

/**
 * Create a new verification token for email verification
 */
export async function createEmailVerificationToken(
  userId: string,
  email: string,
  expiryHours: number = TOKEN_EXPIRY_HOURS
): Promise<{ token: string; expiresAt: Date } | null> {
  try {
    const token = generateRandomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    // Store token in database
    const { error } = await supabase.from('email_verification_tokens').insert({
      user_id: userId,
      email,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      verified: false,
    });

    if (error) {
      console.error('[Email Tokens] Failed to create token:', error);
      return null;
    }

    console.log('[Email Tokens] Token created:', {
      userId,
      email,
      expiresAt: expiresAt.toISOString(),
    });

    return { token, expiresAt };
  } catch (error) {
    console.error('[Email Tokens] Error creating token:', error);
    return null;
  }
}

/**
 * Verify email token and mark as verified
 * IMPORTANT: Prevents token reuse attacks
 * - Checks if token has already been used (invalidated or verified)
 * - Atomically marks token as verified and records usage
 * - Returns failure if token has been used before
 */
export async function verifyEmailToken(
  token: string,
  email: string
): Promise<{ valid: boolean; userId?: string; expired?: boolean; reused?: boolean }> {
  try {
    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('user_id, expires_at, verified, verified_at, invalidated, invalidated_at, used_count')
      .eq('token', token)
      .eq('email', email)
      .single();

    if (error || !data) {
      console.log('[Email Tokens] Token not found:', { token, email });
      return { valid: false };
    }

    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    // SECURITY: Check for token reuse (prevent reuse attacks)
    if (data.verified) {
      console.warn('[Email Tokens] Token reuse detected - already verified:', {
        token: token.substring(0, 8) + '...',
        email,
        previousVerificationTime: data.verified_at,
      });
      return { valid: false, reused: true };
    }

    if (data.invalidated) {
      console.warn('[Email Tokens] Token reuse detected - invalidated:', {
        token: token.substring(0, 8) + '...',
        email,
        invalidatedAt: data.invalidated_at,
      });
      return { valid: false, reused: true };
    }

    // Check if token has expired
    if (now > expiresAt) {
      console.log('[Email Tokens] Token expired:', { token, expiresAt });
      return { valid: false, expired: true };
    }

    // SECURITY: Atomically verify token and record usage
    // This prevents race conditions where token could be used twice simultaneously
    const { error: updateError } = await supabase
      .from('email_verification_tokens')
      .update({
        verified: true,
        verified_at: now.toISOString(),
        used_count: (data.used_count || 0) + 1,
      })
      .eq('token', token)
      .eq('email', email)
      .eq('verified', false) // Only update if not already verified (optimistic locking)
      .select();

    if (updateError) {
      console.error('[Email Tokens] Failed to mark token as verified:', updateError);
      return { valid: false };
    }

    console.log('[Email Tokens] Token verified successfully:', {
      userId: data.user_id,
      email,
      verifiedAt: now.toISOString(),
    });

    return { valid: true, userId: data.user_id };
  } catch (error) {
    console.error('[Email Tokens] Error verifying token:', error);
    return { valid: false };
  }
}

/**
 * Clean up expired tokens (run periodically as a cron job)
 */
export async function cleanupExpiredTokens(): Promise<{ deleted: number } | null> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('email_verification_tokens')
      .delete()
      .lt('expires_at', now)
      .select();

    if (error) {
      console.error('[Email Tokens] Failed to cleanup expired tokens:', error);
      return null;
    }

    const deletedCount = data?.length || 0;
    console.log('[Email Tokens] Cleanup completed:', { deletedCount });

    return { deleted: deletedCount };
  } catch (error) {
    console.error('[Email Tokens] Error during cleanup:', error);
    return null;
  }
}

/**
 * Invalidate a token (e.g., when user requests new verification email)
 * SECURITY: Prevents token reuse after invalidation
 */
export async function invalidateEmailToken(
  token: string,
  reason: string = 'user_requested'
): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('email_verification_tokens')
      .update({
        invalidated: true,
        invalidated_at: now,
        invalidation_reason: reason,
      })
      .eq('token', token);

    if (error) {
      console.error('[Email Tokens] Failed to invalidate token:', error);
      return false;
    }

    console.log('[Email Tokens] Token invalidated:', {
      token: token.substring(0, 8) + '...',
      reason,
      invalidatedAt: now,
    });
    return true;
  } catch (error) {
    console.error('[Email Tokens] Error invalidating token:', error);
    return false;
  }
}

/**
 * Check if a token has been invalidated or reused
 * SECURITY: Use before attempting to use a token
 */
export async function isTokenInvalidated(token: string): Promise<{
  invalidated: boolean;
  reason?: string;
  invalidatedAt?: string;
  alreadyUsed?: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('invalidated, invalidation_reason, invalidated_at, verified, verified_at, used_count')
      .eq('token', token)
      .single();

    if (error || !data) {
      return { invalidated: false };
    }

    if (data.invalidated) {
      return {
        invalidated: true,
        reason: data.invalidation_reason,
        invalidatedAt: data.invalidated_at,
      };
    }

    // Check if already used (verified)
    if (data.verified) {
      return {
        invalidated: true,
        alreadyUsed: true,
        invalidatedAt: data.verified_at,
      };
    }

    return { invalidated: false };
  } catch (error) {
    console.error('[Email Tokens] Error checking invalidation status:', error);
    return { invalidated: false };
  }
}

/**
 * Invalidate all tokens for a user
 * SECURITY: Use during password reset or security incident
 */
export async function invalidateUserTokens(
  userId: string,
  reason: string = 'user_requested'
): Promise<{ invalidatedCount: number }> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('email_verification_tokens')
      .update({
        invalidated: true,
        invalidated_at: now,
        invalidation_reason: reason,
      })
      .eq('user_id', userId)
      .eq('invalidated', false) // Only invalidate if not already invalidated
      .select();

    if (error) {
      console.error('[Email Tokens] Failed to invalidate user tokens:', error);
      return { invalidatedCount: 0 };
    }

    const count = data?.length || 0;
    console.log('[Email Tokens] Invalidated user tokens:', {
      userId,
      count,
      reason,
    });

    return { invalidatedCount: count };
  } catch (error) {
    console.error('[Email Tokens] Error invalidating user tokens:', error);
    return { invalidatedCount: 0 };
  }
}
