/**
 * API Route: POST /api/auth/send-verification-email
 * Sends verification email to user's email address
 * Supports bilingual emails (EN/HE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/email/service';
import { createEmailVerificationToken } from '@/lib/email/tokens';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, userName, locale = 'en' } = body;

    // Validate required fields
    if (!userId || !email || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, userName' },
        { status: 400 }
      );
    }

    // Validate locale
    if (!['en', 'he'].includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale. Must be "en" or "he"' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Create verification token
    const tokenResult = await createEmailVerificationToken(userId, email);
    if (!tokenResult) {
      return NextResponse.json(
        { error: 'Failed to create verification token' },
        { status: 500 }
      );
    }

    // Get base URL for verification link
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://divedrop.com';

    // Send verification email
    const emailResult = await sendVerificationEmail({
      email,
      userId,
      userName,
      locale,
      verificationToken: tokenResult.token,
      baseUrl,
      expiryHours: 24,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: locale === 'he'
          ? 'דוא"ל אימות נשלח בהצלחה'
          : 'Verification email sent successfully',
        messageId: emailResult.messageId,
        expiresAt: tokenResult.expiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth API] Send verification email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
