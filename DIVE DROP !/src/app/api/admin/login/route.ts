import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSession } from '@/lib/admin/jwt-service';
import { verifyPasswordSync } from '@/lib/security/password-validation';
import { constantTimeEqual } from '@/lib/security/password-validation';
import {
  withRateLimit,
  recordFailedLogin,
  resetRateLimit,
  RATE_LIMIT_CONFIGS,
  getClientIP as getRateLimiterClientIP,
} from '@/lib/security/rate-limiter';
import { validateCSRFMiddleware, createResponseWithCSRFToken } from '@/lib/security/csrf';

/**
 * Admin login request schema with Zod validation
 */
const adminLoginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters'),
  password: z.string().min(1, 'Password is required').max(500, 'Password is too long'),
  _csrf: z.string().optional(), // CSRF token
});

type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * Security: Validate admin credentials using constant-time comparison
 * Prevents timing attacks that leak information about username/password validity
 */
function validateAdminCredentialsSecure(username: string, password: string): boolean {
  const expectedUsername1 = process.env.ADMIN_USERNAME || '';
  const expectedPassword1 = process.env.ADMIN_PASSWORD || '';
  const expectedUsername2 = process.env.ADMIN_USERNAME_2 || '';
  const expectedPassword2 = process.env.ADMIN_PASSWORD_2 || '';

  // Use constant-time comparison for both username and password
  const match1 =
    constantTimeEqual(username, expectedUsername1) &&
    constantTimeEqual(password, expectedPassword1) &&
    expectedUsername1.length > 0;

  const match2 =
    constantTimeEqual(username, expectedUsername2) &&
    constantTimeEqual(password, expectedPassword2) &&
    expectedUsername2.length > 0;

  // Return in constant time (both comparisons always executed)
  return match1 || match2;
}

export async function POST(request: NextRequest) {
  const clientIP = getRateLimiterClientIP(request);

  try {
    // SECURITY: Check CSRF token first
    const csrfValidation = await validateCSRFMiddleware(request);
    if (!csrfValidation.valid) {
      console.warn(`[ADMIN AUTH] CSRF validation failed for IP: ${clientIP}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request. Missing or invalid CSRF token.',
        },
        { status: 403 }
      );
    }

    // SECURITY: Check rate limit using middleware
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) {
      console.warn(`[ADMIN AUTH] Rate limit exceeded for IP: ${clientIP}`);
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await request.json();

    let validatedData: AdminLoginInput;
    try {
      validatedData = adminLoginSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errors = validationError.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        console.warn(`[ADMIN AUTH] Input validation failed for IP: ${clientIP}`, { errors });

        return NextResponse.json(
          {
            success: false,
            error: 'Invalid input. Please check your credentials.',
            details: errors,
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    const { username, password } = validatedData;

    // SECURITY: Validate credentials using constant-time comparison
    const credentialsValid = validateAdminCredentialsSecure(username, password);

    if (!credentialsValid) {
      // Record failed login attempt
      const failureResult = await recordFailedLogin(request);

      console.warn(`[ADMIN AUTH] Failed login attempt for IP: ${clientIP}`, {
        username,
        locked: !failureResult.allowed,
      });

      // Generic error message (don't reveal if username exists)
      let errorMessage = 'Invalid username or password.';
      if (!failureResult.allowed) {
        errorMessage = failureResult.message || 'Too many failed attempts. Please try again later.';
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 401 }
      );
    }

    // SECURITY: Reset rate limit on successful login
    await resetRateLimit(request);

    // Create admin session
    const session = await createAdminSession(username);

    // Log successful admin login
    console.log(`[ADMIN AUTH] Successful login for user: ${username}`, {
      ip: clientIP,
      timestamp: new Date().toISOString(),
    });

    // Create response with CSRF token and secure cookies
    const response = createResponseWithCSRFToken({
      success: true,
      data: {
        user: {
          username: session.username,
          role: session.role,
        },
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });

    // Set secure httpOnly cookie for token
    response.cookies.set({
      name: 'admin_token',
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/admin',
    });

    // Set refresh token in secure httpOnly cookie
    response.cookies.set({
      name: 'admin_refresh_token',
      value: session.refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 72 * 60 * 60, // 72 hours
      path: '/admin',
    });

    return response;
  } catch (error) {
    console.error('[ADMIN AUTH ERROR]', error, {
      ip: clientIP,
      timestamp: new Date().toISOString(),
    });

    // Don't expose internal error details
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during login. Please try again later.',
      },
      { status: 500 }
    );
  }
}
