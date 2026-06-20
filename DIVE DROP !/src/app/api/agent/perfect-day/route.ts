/**
 * Perfect Day Agent Route
 *
 * SECURITY FIXES:
 * 1. Validates request body with Zod schema
 * 2. Detects prompt injection attempts
 * 3. Sanitizes user input before passing to LLM
 * 4. Uses Next.js 16 async params pattern
 *
 * This route handles recommendations for perfect dive days based on user profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { PerfectDayAnswers, DivePlan } from '@/types/agent';
import {
  PerfectDayAgentRequestSchema,
  validateAgentRequest,
  detectPromptInjection,
  sanitizePromptInput,
  getSystemPrompt,
  constructUserPrompt,
} from '@/lib/agent/prompt-sanitization';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * POST /api/agent/perfect-day
 *
 * Request body:
 * {
 *   "answers": {
 *     "experienceLevel": "beginner" | "intermediate" | "advanced" | "expert",
 *     "goal": "string (max 500 chars)",
 *     "guidePreference": "yes" | "no" | "maybe"
 *   },
 *   "locale": "en" | "he" (optional, defaults to "en")
 * }
 *
 * Response:
 * {
 *   "plan": {
 *     "siteId": "string",
 *     "siteName": "string",
 *     "siteDepth": number,
 *     "siteDifficulty": string,
 *     "siteLocation": string,
 *     "instructors": [{ "id": "string", "firstName": string, "lastName": string }],
 *     "message": "string",
 *     "tips": ["string", "string", "string"]
 *   }
 * }
 *
 * Error responses:
 * - 401: Unauthorized (user not authenticated)
 * - 400: Bad request (validation failed)
 * - 403: Forbidden (prompt injection detected)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // ===== STEP 1: Authentication =====
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ===== STEP 2: Parse and validate request body =====
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // SECURITY FIX 3: Validate request against schema
    const validation = validateAgentRequest(requestBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error || 'Request validation failed' },
        { status: 400 }
      );
    }

    const validatedRequest = validation.data!;
    const answers = validatedRequest.answers;
    const locale = validatedRequest.locale;

    // ===== STEP 3: Prompt injection detection =====
    // Check each user-provided field for injection attempts
    const injectionDetection = detectPromptInjection(answers.goal);

    if (injectionDetection.isInjection) {
      console.warn(
        `Prompt injection attempt detected for user ${user.id}:`,
        injectionDetection.detectedPatterns
      );

      return NextResponse.json(
        {
          error:
            'Your input contains suspicious patterns. ' +
            'Please use natural language without special instructions.',
        },
        { status: 403 }
      );
    }

    // ===== STEP 4: Fetch data from database =====
    // Fetch dive sites
    const { data: sites, error: sitesError } = await supabase
      .from('dive_sites')
      .select('*')
      .limit(10);

    if (sitesError || !sites) {
      console.error('Supabase fetch sites error:', sitesError);
      return NextResponse.json(
        { error: 'Failed to fetch dive sites' },
        { status: 500 }
      );
    }

    // Fetch instructors
    const { data: instructors, error: instructorsError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('diving_experience', 'instructor')
      .limit(6);

    if (instructorsError) {
      console.error('Supabase fetch instructors error:', instructorsError);
    }

    // ===== STEP 5: Construct safe prompts =====
    const language = locale === 'he' ? 'Hebrew' : 'English';

    // Get system prompt (no injection risk - hardcoded)
    const systemPrompt = getSystemPrompt();

    // Construct user prompt with sanitized input and clear boundaries
    const userPrompt = constructUserPrompt(
      answers.experienceLevel,
      answers.goal,
      answers.guidePreference,
      language,
      JSON.stringify(sites, null, 2),
      JSON.stringify(instructors || [], null, 2)
    );

    // ===== STEP 6: Call Anthropic API =====
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // ===== STEP 7: Parse and validate response =====
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    let plan: DivePlan;
    try {
      plan = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Claude response:', responseText);
      return NextResponse.json(
        {
          error:
            'Failed to parse AI response. Please try again with different inputs.',
        },
        { status: 500 }
      );
    }

    // ===== STEP 8: Return successful response =====
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Perfect day API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
