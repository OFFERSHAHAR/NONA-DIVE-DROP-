/**
 * Link a Bit account for a service provider
 * POST /api/payments/bit/link-account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getBitApiClient, BitApiError } from '@/lib/payments/bit.api';
import { linkBitAccountSchema } from '@/lib/payments/bit.schemas';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = linkBitAccountSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Get Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Verify user is a service provider
    const { data: serviceProvider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!serviceProvider) {
      return NextResponse.json(
        { error: 'You must be a service provider to link a Bit account' },
        { status: 403 }
      );
    }

    // Check for existing account with same Bit ID
    const { data: existingAccount } = await supabase
      .from('bit_accounts')
      .select('id')
      .eq('bit_id', input.bit_id)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: 'This Bit ID is already linked to another account' },
        { status: 409 }
      );
    }

    // Link account via Bit API (optional - for verification)
    const bitClient = getBitApiClient();

    try {
      const bitAccountInfo = await bitClient.resolveBankDetails(input.bit_id);
      console.log('Resolved Bit account info:', bitAccountInfo);
    } catch (error) {
      console.warn('Could not verify Bit account with API:', error);
      // Don't fail - allow linking even if API verification fails
    }

    // Store account in database
    const { data: accountData, error: insertError } = await supabase
      .from('bit_accounts')
      .insert({
        service_provider_id: user.id,
        account_type: input.account_type,
        bit_id: input.bit_id,
        bit_phone: input.phone_number,
        bit_display_name: input.display_name,
        bank_code: input.bank_code,
        branch_code: input.branch_code,
        account_number: input.account_number,
        account_holder_name: input.account_holder_name,
        is_payout_account: input.is_payout_account,
        bit_status: 'pending_verification',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert Bit account:', insertError);
      return NextResponse.json(
        { error: 'Failed to link Bit account' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Bit account linked successfully',
        account: {
          id: accountData.id,
          account_type: accountData.account_type,
          bit_id: accountData.bit_id,
          bit_display_name: accountData.bit_display_name,
          bit_status: accountData.bit_status,
          is_payout_account: accountData.is_payout_account,
          created_at: accountData.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Account linking error:', error);

    if (error instanceof BitApiError) {
      return NextResponse.json(
        {
          error: 'Bit API error',
          message: error.message,
          code: error.code,
        },
        { status: error.statusCode || 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
