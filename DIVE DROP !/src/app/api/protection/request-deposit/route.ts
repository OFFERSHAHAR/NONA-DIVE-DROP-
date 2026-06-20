/**
 * POST /api/protection/request-deposit
 * Request deposit from user (instructor/lister action)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlockingService } from '@/lib/protection/blocking-service';
import { RequestDepositRequest } from '@/types/protection';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user (provider requesting deposit)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: RequestDepositRequest = await request.json();

    // Validate request
    if (!body.user_id || !body.amount || !body.requirement_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    const blockingService = new BlockingService();
    const deposit = await blockingService.requestDeposit(currentUser.id, body);

    return NextResponse.json(deposit, { status: 201 });
  } catch (error) {
    console.error('Error requesting deposit:', error);
    return NextResponse.json(
      { error: 'Failed to request deposit' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/protection/request-deposit
 * Get pending deposits for current user
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
    const deposits = await blockingService.getPendingDeposits(currentUser.id);

    return NextResponse.json({
      deposits,
      total_pending: deposits.length,
    });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deposits' },
      { status: 500 }
    );
  }
}
