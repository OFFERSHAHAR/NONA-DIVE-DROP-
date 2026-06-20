/**
 * POST /api/protection/block-user
 * Block a user (instructor/lister action)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlockingService } from '@/lib/protection/blocking-service';
import { BlockUserRequest } from '@/types/protection';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user (provider doing the blocking)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get provider type
    const { data: provider } = await supabase
      .from('service_providers')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (!provider) {
      return NextResponse.json(
        { error: 'Not a provider' },
        { status: 403 }
      );
    }

    const body: BlockUserRequest = await request.json();

    // Validate request
    if (!body.blocked_user_id || !body.reason || !body.reason_category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const blockingService = new BlockingService();
    const userType = provider.provider_type as 'instructor' | 'lister' | 'provider';

    const block = await blockingService.blockUser(
      currentUser.id,
      userType,
      body
    );

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { error: 'Failed to block user' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/protection/block-user
 * Get list of blocked users (by current provider)
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const blockingService = new BlockingService();
    const blockedUsers = await blockingService.getBlockedUsers(currentUser.id);

    return NextResponse.json({
      blocked_users: blockedUsers,
      total_blocked: blockedUsers.length,
    });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocked users' },
      { status: 500 }
    );
  }
}
