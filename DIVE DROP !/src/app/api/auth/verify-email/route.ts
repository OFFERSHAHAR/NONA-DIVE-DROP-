/**
 * API Route: POST /api/auth/verify-email
 * Verifies email token and completes email verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/email/tokens';
import { sendWelcomeEmail } from '@/lib/email/service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    // Validate required fields
    if (!token || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: token, email' },
        { status: 400 }
      );
    }

    // Verify the token
    const verification = await verifyEmailToken(token, email);

    if (!verification.valid) {
      if (verification.expired) {
        return NextResponse.json(
          {
            error: 'Verification link has expired',
            expired: true,
          },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 401 }
      );
    }

    const userId = verification.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user data to send welcome email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, locale')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[Verify Email] User not found:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user's email_verified status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Verify Email] Failed to update user:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      );
    }

    // Send welcome email
    const welcomeResult = await sendWelcomeEmail({
      email: user.email,
      userId,
      userName: user.first_name || 'User',
      locale: (user.locale || 'en') as 'en' | 'he',
    });

    if (!welcomeResult.success) {
      console.warn('[Verify Email] Welcome email failed, but verification succeeded:', welcomeResult.error);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email verified successfully',
        userId,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Verify Email API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to handle verification link in email
 * Redirects to verification page with token and email
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const email = request.nextUrl.searchParams.get('email');
    const locale = request.nextUrl.searchParams.get('locale') || 'en';

    if (!token || !email) {
      return NextResponse.redirect(
        new URL(
          `/auth/verify-email?error=missing_params&locale=${locale}`,
          request.nextUrl.origin
        )
      );
    }

    // Verify the email
    const verification = await verifyEmailToken(token, email);

    if (!verification.valid) {
      const error = verification.expired ? 'link_expired' : 'invalid_token';
      return NextResponse.redirect(
        new URL(
          `/auth/verify-email?error=${error}&locale=${locale}`,
          request.nextUrl.origin
        )
      );
    }

    const userId = verification.userId;

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, locale')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.redirect(
        new URL(
          `/auth/verify-email?error=user_not_found&locale=${locale}`,
          request.nextUrl.origin
        )
      );
    }

    // Update user's email_verified status
    await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Send welcome email
    await sendWelcomeEmail({
      email: user.email,
      userId,
      userName: user.first_name || 'User',
      locale: (user.locale || 'en') as 'en' | 'he',
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/auth/verify-email?success=true&locale=${locale}`,
        request.nextUrl.origin
      )
    );
  } catch (error) {
    console.error('[Verify Email GET] Error:', error);
    return NextResponse.redirect(
      new URL(
        `/auth/verify-email?error=server_error`,
        request.nextUrl.origin
      )
    );
  }
}
