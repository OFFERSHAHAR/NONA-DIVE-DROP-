import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { feedbackInsertSchema } from '@/lib/feedback/validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * POST /api/feedback
 * Submit feedback on dive conditions at a dive site
 *
 * Request body: FeedbackInsertInput
 * - visibility_meters: number (0-50)
 * - temperature_celsius: number (5-40)
 * - current_strength: number (0-10)
 * - marine_life: string[] (valid species keys)
 * - marine_life_custom: string | null (max 200 chars)
 * - notes: string (max 300 chars)
 * - image_urls: string[] (max 3, valid URLs)
 * - dive_booking_id: UUID
 * - dive_site_id: UUID
 * - (diver_id is overridden from auth.uid())
 *
 * Returns on success (201):
 * {
 *   id: string,
 *   dive_booking_id: string,
 *   diver_id: string,
 *   dive_site_id: string,
 *   visibility_meters: number,
 *   temperature_celsius: number,
 *   current_strength: number,
 *   marine_life: string[],
 *   marine_life_custom: string | null,
 *   notes: string,
 *   image_urls: string[],
 *   submitted_at: string,
 *   created_at: string
 * }
 *
 * Returns on error:
 * - 400: Validation error with error details
 * - 401: Unauthorized (user not logged in)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client and authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check authentication
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();

    // Validate against feedbackInsertSchema
    // This will check all constraints: ranges, array lengths, formats, etc.
    const validationResult = feedbackInsertSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }

    const feedbackData = validationResult.data;

    // Override diver_id with authenticated user ID for security
    // This prevents users from submitting feedback as another user
    const insertData = {
      ...feedbackData,
      diver_id: user.id,
    };

    // Insert feedback into database
    // Row-level security (RLS) will enforce that only this user can insert
    const { data, error } = await supabase
      .from('feedback')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      // Don't expose internal DB errors to client
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // Return inserted record with 201 Created status
    // The returned data includes the generated id and timestamps
    return NextResponse.json(data?.[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
