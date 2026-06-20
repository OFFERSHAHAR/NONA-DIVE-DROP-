import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const problematicUsersData = [];

    return NextResponse.json({
      success: true,
      data: problematicUsersData,
    });
  } catch (error) {
    console.error('Problematic users fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch problematic users' },
      { status: 500 }
    );
  }
}
