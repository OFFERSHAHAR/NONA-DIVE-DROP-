import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { feedbackInsertSchema } from '@/lib/feedback/validation';
import { sanitizeNotes, sanitizeMarineLifeCustom } from '@/lib/feedback/sanitization';
import { withRateLimit } from '@/lib/security/rate-limiter';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * POST /api/feedback
 * Submit feedback on dive conditions at a dive site
 *
 * Rate limiting:
 * - 5 submissions per hour per user (429 if exceeded)
 *
 * Security:
 * - XSS prevention: All text fields (notes, marine_life_custom) are sanitized
 * - Image validation: MIME type, size (2MB max), dimensions verified server-side
 * - Authentication required: User must be logged in
 *
 * Request body: FeedbackInsertInput
 * - visibility_meters: number (0-50)
 * - temperature_celsius: number (5-40)
 * - current_strength: number (0-10)
 * - marine_life: string[] (valid species keys)
 * - marine_life_custom: string | null (max 200 chars, sanitized)
 * - notes: string (max 300 chars, sanitized)
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
 * - 429: Rate limit exceeded (5 per hour per user)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  // Rate limiting: Check if user has exceeded 5 feedback submissions per hour
  const rateLimitResult = await withRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }
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

    // Parse request body
    const body = await request.json();

    // XSS PREVENTION: Sanitize text fields before validation
    try {
      if (body.notes) {
        body.notes = sanitizeNotes(body.notes);
      }
      if (body.marine_life_custom) {
        body.marine_life_custom = sanitizeMarineLifeCustom(body.marine_life_custom);
      }
    } catch (sanitizationError) {
      return NextResponse.json(
        { error: `Sanitization error: ${sanitizationError instanceof Error ? sanitizationError.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

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
