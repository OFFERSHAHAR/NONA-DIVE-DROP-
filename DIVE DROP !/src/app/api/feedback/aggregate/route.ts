import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aggregatedConditionsSchema } from '@/lib/feedback/validation';
import type { AggregatedConditions } from '@/types/feedback';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feedback/aggregate?siteId=<uuid>
 * Get aggregated dive conditions for a specific dive site
 *
 * Query parameters:
 * - siteId (required): UUID of the dive site
 *
 * Returns on success (200):
 * {
 *   date: string (YYYY-MM-DD),
 *   visibility_avg: number,
 *   visibility_min: number,
 *   visibility_max: number,
 *   temperature_avg: number,
 *   current_strength_avg: number,
 *   species_counts: Record<string, number>,
 *   total_feedback_count: number (minimum 2),
 *   cached_at: string (ISO 8601)
 * }
 *
 * Returns on error:
 * - 400: siteId query parameter missing
 * - 404: Insufficient feedback data (< 2 entries for today)
 *   {
 *     error: string,
 *     total_feedback_count: number
 *   }
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Extract siteId query parameter
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    // Validate required parameter
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required query parameter: siteId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get today's date in YYYY-MM-DD format for query consistency
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Check if cached aggregation exists and is fresh (< 5 minutes old)
    const { data: cachedData, error: cacheError } = await supabase
      .from('aggregated_conditions')
      .select('*')
      .eq('dive_site_id', siteId)
      .eq('date', today)
      .single();

    // If we have cached data, check if it's fresh enough (less than 5 minutes old)
    if (cachedData && !cacheError) {
      const cachedAtTime = new Date(cachedData.cached_at).getTime();
      const nowTime = Date.now();
      const ageMins = (nowTime - cachedAtTime) / (1000 * 60);

      // If cache is fresh (< 5 minutes), return it immediately
      if (ageMins < 5) {
        // Transform database record to match AggregatedConditions type
        const response: AggregatedConditions = {
          date: cachedData.date,
          visibility_avg: cachedData.visibility_avg || 0,
          visibility_min: cachedData.visibility_min || 0,
          visibility_max: cachedData.visibility_max || 0,
          temperature_avg: cachedData.temperature_avg || 0,
          current_strength_avg: cachedData.current_strength_avg || 0,
          species_counts: cachedData.species_counts || {},
          total_feedback_count: cachedData.total_feedback_count,
          cached_at: cachedData.cached_at,
        };

        return NextResponse.json(response);
      }
    }

    // Step 2: Cache is stale or missing, calculate fresh aggregation
    // Query feedback table for today's entries for this site
    const { data: feedbackEntries, error: feedbackError } = await supabase
      .from('feedback')
      .select(
        `
        id,
        visibility_meters,
        temperature_celsius,
        current_strength,
        marine_life,
        created_at
        `
      )
      .eq('dive_site_id', siteId)
      // Filter for today's feedback only
      // Note: created_at is stored as TIMESTAMP which is in UTC
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to fetch feedback data' },
        { status: 500 }
      );
    }

    // Check minimum feedback count requirement (2 entries)
    const feedbackCount = feedbackEntries?.length || 0;
    if (feedbackCount < 2) {
      return NextResponse.json(
        {
          error: 'Insufficient feedback data. Minimum 2 feedback entries required.',
          total_feedback_count: feedbackCount,
        },
        { status: 404 }
      );
    }

    // Step 3: Calculate aggregations from feedback entries
    let visibility_sum = 0;
    let visibility_min = Number.MAX_VALUE;
    let visibility_max = Number.MIN_VALUE;
    let temperature_sum = 0;
    let current_strength_sum = 0;
    const species_count_map: Record<string, number> = {};

    feedbackEntries.forEach((entry: any) => {
      // Aggregate visibility stats
      const visibility = Number(entry.visibility_meters);
      visibility_sum += visibility;
      visibility_min = Math.min(visibility_min, visibility);
      visibility_max = Math.max(visibility_max, visibility);

      // Aggregate temperature
      temperature_sum += Number(entry.temperature_celsius);

      // Aggregate current strength
      current_strength_sum += Number(entry.current_strength);

      // Count marine species
      if (entry.marine_life && Array.isArray(entry.marine_life)) {
        entry.marine_life.forEach((species: string) => {
          species_count_map[species] = (species_count_map[species] || 0) + 1;
        });
      }
    });

    // Calculate averages
    const visibility_avg = visibility_sum / feedbackCount;
    const temperature_avg = temperature_sum / feedbackCount;
    const current_strength_avg = current_strength_sum / feedbackCount;

    // Step 4: Insert/upsert aggregation into cache table
    const aggregationRecord = {
      dive_site_id: siteId,
      date: today,
      visibility_avg,
      visibility_min,
      visibility_max,
      temperature_avg,
      current_strength_avg,
      species_counts: species_count_map,
      total_feedback_count: feedbackCount,
      cached_at: new Date().toISOString(),
    };

    // Upsert (insert or update if exists)
    const { error: upsertError } = await supabase
      .from('aggregated_conditions')
      .upsert(aggregationRecord, {
        onConflict: 'dive_site_id,date',
      });

    if (upsertError) {
      console.error('Error upserting aggregation:', upsertError);
      // Even if cache update fails, we can still return the calculated data
      // Just log the error and continue
    }

    // Step 5: Validate aggregated data against schema
    const validationResult = aggregatedConditionsSchema.safeParse(
      aggregationRecord
    );

    if (!validationResult.success) {
      console.error('Aggregation validation error:', validationResult.error);
      return NextResponse.json(
        { error: 'Failed to validate aggregated data' },
        { status: 500 }
      );
    }

    // Return aggregated conditions
    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error('Aggregate endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
