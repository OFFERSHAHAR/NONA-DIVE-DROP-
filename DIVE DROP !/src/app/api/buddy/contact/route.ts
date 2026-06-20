import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  revealContactSchema,
} from '@/lib/buddy/schemas';
import {
  withBuddyAuth,
  successResponse,
  errorResponse,
  withRateLimit,
  rateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/buddy/middleware';
import { logContactReveal } from '@/lib/buddy/audit';
import type { Database } from '@/types/supabase';

/**
 * POST /api/buddy/contact/reveal/:listing_id
 * Reveal contact info for a listing's owner after mutual interest
 *
 * Security: Only reveal if:
 * 1. Both users have mutual interest in each other
 * 2. Requestor has accepted interest from listing owner
 * 3. Listing owner has accepted interest from requestor
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withBuddyAuth(request);
  if (authError) return authError;

  // Rate limiting - stricter for contact reveals
  const rateLimiter = withRateLimit(rateLimitConfigs.contactReveal);
  const limitCheck = rateLimiter(`contact:reveal:${context.userId}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const body = await request.json();
    const validation = revealContactSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.issues[0].message}`,
        400
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Get listing owner
    const { data: listing, error: listingError } = await supabase
      .from('buddy_listings')
      .select('user_id')
      .eq('id', validation.data.listing_id)
      .single();

    if (listingError || !listing) {
      return errorResponse('Listing not found', 404);
    }

    const listingOwnerId = listing.user_id;

    // Check mutual acceptance
    // Need both interests to be 'accepted'
    const { data: interests, error: interestsError } = await supabase
      .from('buddy_interests')
      .select('id, requester_id, owner_id, status')
      .or(
        `and(listing_id.eq.${validation.data.listing_id},requester_id.eq.${context.userId},owner_id.eq.${listingOwnerId}),` +
        `and(listing_id.eq.${validation.data.listing_id},requester_id.eq.${listingOwnerId},owner_id.eq.${context.userId})`
      );

    if (interestsError) throw interestsError;

    // Both interests should exist and be accepted
    const mutualAccepted = interests &&
      interests.length >= 1 &&
      interests.some(i => i.status === 'accepted' &&
        ((i.requester_id === context.userId && i.owner_id === listingOwnerId) ||
         (i.requester_id === listingOwnerId && i.owner_id === context.userId)));

    if (!mutualAccepted) {
      return errorResponse(
        'Contact can only be revealed when both users have accepted the interest',
        403
      );
    }

    // Get contact info for listing owner
    const { data: contactUser, error: contactError } = await supabase
      .from('users')
      .select('email, phone')
      .eq('id', listingOwnerId)
      .single();

    if (contactError) {
      // Phone might not be stored - get just email from auth
      const { data: authData } = await supabase.auth.admin.getUserById(listingOwnerId);
      const authUser = authData.user;
      if (!authUser) {
        return errorResponse('User not found', 404);
      }

      // Log the reveal
      await logContactReveal(
        context.userId,
        listingOwnerId,
        validation.data.listing_id,
        context.ip,
        context.userAgent
      );

      return NextResponse.json(successResponse({
        email: authUser.email,
        phone: null,
      }));
    }

    // Log the reveal
    await logContactReveal(
      context.userId,
      listingOwnerId,
      validation.data.listing_id,
      context.ip,
      context.userAgent
    );

    // Return contact info
    return NextResponse.json(successResponse({
      email: contactUser?.email,
      phone: contactUser?.phone || null,
    }));
  } catch (error: any) {
    console.error('POST /api/buddy/contact error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * GET /api/buddy/contact/:user_id
 * Get contact info for a user (after they've accepted interest)
 */
export async function GET(request: NextRequest) {
  const { data: context, error: authError } = await withBuddyAuth(request);
  if (authError) return authError;
  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) return errorResponse('user_id query parameter required', 400);

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Check if there's a mutual accepted interest
    const { data: interests } = await supabase
      .from('buddy_interests')
      .select('id')
      .or(
        `and(requester_id.eq.${context.userId},owner_id.eq.${userId},status.eq.accepted),` +
        `and(requester_id.eq.${userId},owner_id.eq.${context.userId},status.eq.accepted)`
      )
      .limit(1);

    if (!interests || interests.length === 0) {
      return errorResponse(
        'You do not have permission to view this user\'s contact information',
        403
      );
    }

    // Get contact info
    const { data: user, error } = await supabase
      .from('users')
      .select('email, phone')
      .eq('id', userId)
      .single();

    if (error) {
      return errorResponse('User not found', 404);
    }

    return NextResponse.json(successResponse({
      email: user?.email,
      phone: user?.phone || null,
    }));
  } catch (error: any) {
    console.error('GET /api/buddy/contact/:user_id error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
