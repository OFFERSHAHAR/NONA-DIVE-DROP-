/**
 * Cron Job: Clean up expired email verification tokens
 * Run this periodically (e.g., daily) to maintain database hygiene
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens } from '@/lib/email/tokens';

// Verify cron secret
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    // Verify the cron secret header
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await cleanupExpiredTokens();

    if (!result) {
      return NextResponse.json(
        { error: 'Cleanup failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Cleanup completed',
        deletedTokens: result.deleted,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Cron] Cleanup verification tokens error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
