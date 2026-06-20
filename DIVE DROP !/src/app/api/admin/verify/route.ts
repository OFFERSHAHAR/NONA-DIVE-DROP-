import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await withAdminAuth(request);

    if (error) {
      return error;
    }

    return NextResponse.json({
      success: true,
      data: {
        username: data?.username,
        role: data?.role,
        isAuthenticated: true,
      },
    });
  } catch (error) {
    console.error('[ADMIN VERIFY ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Verification failed',
      },
      { status: 500 }
    );
  }
}
