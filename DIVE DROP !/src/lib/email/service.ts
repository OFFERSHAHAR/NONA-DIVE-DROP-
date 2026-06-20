/**
 * Email Service - Handles all email operations with Resend
 * Supports verification emails, welcome emails, and tracking
 */

import { Resend } from 'resend';
import { getVerificationEmailTemplate, getWelcomeEmailTemplate } from './templates';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@divedrop.com';

// Supabase client for tracking email status
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface EmailVerificationRequest {
  email: string;
  userId: string;
  userName: string;
  locale: 'en' | 'he';
  verificationToken: string;
  baseUrl: string;
  expiryHours?: number;
}

export interface WelcomeEmailRequest {
  email: string;
  userId: string;
  userName: string;
  locale: 'en' | 'he';
}

export interface EmailStatusResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send verification email with bilingual support
 */
export async function sendVerificationEmail(
  request: EmailVerificationRequest
): Promise<EmailStatusResponse> {
  try {
    const { email, userId, userName, locale, verificationToken, baseUrl, expiryHours = 24 } =
      request;

    // Generate verification link
    const verificationLink = new URL('/auth/verify-email', baseUrl);
    verificationLink.searchParams.set('token', verificationToken);
    verificationLink.searchParams.set('email', email);

    // Get email template
    const { subject, html } = getVerificationEmailTemplate({
      locale,
      userName,
      verificationLink: verificationLink.toString(),
      expiryHours,
    });

    // Send email via Resend
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
      replyTo: 'support@divedrop.com',
    });

    if (response.error) {
      console.error('[Email] Verification email failed:', {
        email,
        error: response.error,
      });
      return {
        success: false,
        error: response.error.message,
      };
    }

    // Log email status to database
    await logEmailStatus({
      userId,
      email,
      type: 'verification',
      locale,
      messageId: response.data?.id || '',
      status: 'sent',
    });

    console.log('[Email] Verification email sent:', {
      email,
      messageId: response.data?.id,
      locale,
    });

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(
  request: WelcomeEmailRequest
): Promise<EmailStatusResponse> {
  try {
    const { email, userId, userName, locale } = request;

    // Get email template
    const { subject, html } = getWelcomeEmailTemplate(locale, userName);

    // Send email via Resend
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
      replyTo: 'support@divedrop.com',
    });

    if (response.error) {
      console.error('[Email] Welcome email failed:', {
        email,
        error: response.error,
      });
      return {
        success: false,
        error: response.error.message,
      };
    }

    // Log email status to database
    await logEmailStatus({
      userId,
      email,
      type: 'welcome',
      locale,
      messageId: response.data?.id || '',
      status: 'sent',
    });

    console.log('[Email] Welcome email sent:', {
      email,
      messageId: response.data?.id,
      locale,
    });

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log email status to Supabase (optional - requires email_logs table)
 */
async function logEmailStatus(data: {
  userId: string;
  email: string;
  type: string;
  locale: string;
  messageId: string;
  status: string;
}): Promise<void> {
  try {
    // Check if email_logs table exists
    const { error } = await supabase.from('email_logs').insert({
      user_id: data.userId,
      email: data.email,
      type: data.type,
      locale: data.locale,
      message_id: data.messageId,
      status: data.status,
      sent_at: new Date().toISOString(),
    });

    if (error) {
      // Table might not exist, silently fail
      console.debug('[Email] Could not log email status:', error.message);
    }
  } catch (error) {
    // Silently fail - logging should not break email sending
    console.debug('[Email] Email status logging failed:', error);
  }
}

/**
 * Verify email token and return user data
 * Integrate with your token verification logic
 */
export async function verifyEmailToken(token: string, email: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    // TODO: Implement token verification logic
    // This should validate the token, check expiry, and return the associated user ID
    // For now, returning placeholder
    return { valid: false };
  } catch (error) {
    console.error('[Email] Token verification failed:', error);
    return { valid: false };
  }
}
