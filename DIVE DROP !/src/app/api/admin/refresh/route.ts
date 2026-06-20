import { NextRequest, NextResponse } from 'next/server';
import { refreshAdminToken } from '@/lib/admin/jwt-service';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = request.cookies.get('admin_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refresh token not found',
        },
        { status: 401 }
      );
    }

    // Refresh the token
    const newSession = await refreshAdminToken(refreshToken);

    if (!newSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired refresh token',
        },
        { status: 401 }
      );
    }

    // Create response with new tokens
    const response = NextResponse.json({
      success: true,
      data: {
        token: newSession.token,
        expiresAt: newSession.expiresAt,
      },
    });

    // Update access token cookie
    response.cookies.set({
      name: 'admin_token',
      value: newSession.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/',
    });

    // Update refresh token cookie
    response.cookies.set({
      name: 'admin_refresh_token',
      value: newSession.refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 72 * 60 * 60,
      path: '/',
    });

    console.log(`[ADMIN AUTH] Token refreshed for user: ${newSession.username}`);

    return response;
  } catch (error) {
    console.error('[ADMIN AUTH ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Token refresh failed',
      },
      { status: 500 }
    );
  }
}
