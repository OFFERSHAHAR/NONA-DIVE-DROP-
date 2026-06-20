import { NextRequest, NextResponse } from 'next/server';
import {
  calculateDailyTrend,
  calculateWeeklyTrend,
  calculateSeasonalTrend,
  getInsights,
} from '@/lib/feedback/trendAnalysis';
import { withRateLimit } from '@/lib/security/rate-limiter';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ============================================================================
// REQUEST VALIDATION SCHEMA
// ============================================================================

const trendsQuerySchema = z.object({
  siteId: z.string().uuid('Invalid site ID format'),
  period: z.enum(['7', '14', '30', '90']).optional().default('30'),
  type: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
});

type TrendsQuery = z.infer<typeof trendsQuerySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface TrendsResponse {
  siteId: string;
  period: string;
  trends: any[];
  totalFeedbackCount: number;
  dataQuality: {
    hasData: boolean;
    minimumThreshold: number;
    actualCount: number;
    percentageFilled: number;
  };
  generatedAt: string;
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

const trendCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function getCacheKey(siteId: string, period: string, type: string): string {
  return `trends:${siteId}:${period}:${type}`;
}

function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * GET /api/feedback/trends?siteId=...&period=30&type=daily
 *
 * Retrieve trend analysis for feedback data at a specific dive site
 *
 * Query parameters:
 * - siteId (required): UUID of the dive site
 * - period (optional): Time range in days - '7', '14', '30', or '90' (default: '30')
 * - type (optional): Granularity - 'daily', 'weekly', or 'monthly' (default: 'daily')
 *
 * Response (200):
 * {
 *   siteId: string,
 *   period: string,
 *   trends: [
 *     {
 *       date: string,            // or 'week' or 'month' depending on type
 *       visibility_avg: number,
 *       temperature_avg: number,
 *       current_avg: number,
 *       count: number,
 *       species_counts: Record<string, number>
 *     }
 *   ],
 *   totalFeedbackCount: number,
 *   dataQuality: {
 *     hasData: boolean,
 *     minimumThreshold: number,
 *     actualCount: number,
 *     percentageFilled: number
 *   },
 *   generatedAt: string
 * }
 *
 * Errors:
 * - 400: Invalid query parameters
 * - 404: No feedback data available
 * - 429: Rate limit exceeded (60 per minute)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const period = searchParams.get('period') || '30';
    const type = searchParams.get('type') || 'daily';

    // Validate input
    const validationResult = trendsQuerySchema.safeParse({
      siteId,
      period,
      type,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const query = validationResult.data;
    const cacheKey = getCacheKey(query.siteId, query.period, query.type);

    // Check cache
    const cached = trendCache.get(cacheKey);
    if (cached && isCacheFresh(cached.timestamp)) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Cache': 'HIT',
        },
      });
    }

    // Determine the time period in days for calculations
    const periodDays = parseInt(query.period, 10);

    // Calculate trends based on requested type
    let result: any;

    switch (query.type) {
      case 'daily':
        result = await calculateDailyTrend(query.siteId, periodDays);
        break;

      case 'weekly':
        const weeksCount = Math.ceil(periodDays / 7);
        result = await calculateWeeklyTrend(query.siteId, weeksCount);
        break;

      case 'monthly':
        const monthsCount = Math.ceil(periodDays / 30);
        result = await calculateSeasonalTrend(query.siteId, monthsCount);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid trend type' },
          { status: 400 }
        );
    }

    // Check if we have sufficient data
    if (!result.dataQuality.hasData) {
      return NextResponse.json(
        {
          error: 'Insufficient feedback data',
          dataQuality: result.dataQuality,
          siteId: query.siteId,
        },
        { status: 404 }
      );
    }

    // Format response
    const response: TrendsResponse = {
      siteId: result.siteId,
      period: `${query.period}-day`,
      trends: result.trends,
      totalFeedbackCount: result.totalFeedbackCount,
      dataQuality: result.dataQuality,
      generatedAt: result.generatedAt,
    };

    // Cache the result
    trendCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    // Return with cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Trends endpoint error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate trends' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback/trends/insights?siteId=...&days=30
 *
 * Get insights and analytics about a dive site
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();

    // Validate siteId
    if (!body.siteId || typeof body.siteId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid siteId in request body' },
        { status: 400 }
      );
    }

    const days = Math.max(7, Math.min(365, body.days || 30));

    // Get insights
    const insights = await getInsights(body.siteId, days);

    return NextResponse.json(
      {
        siteId: body.siteId,
        period: `${days}-day`,
        insights,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
        },
      }
    );
  } catch (error) {
    console.error('Insights endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get insights' },
      { status: 500 }
    );
  }
}
