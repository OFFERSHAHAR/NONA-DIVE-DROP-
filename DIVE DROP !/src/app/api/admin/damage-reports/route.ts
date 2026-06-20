import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const damageReportsData = [];

    return NextResponse.json({
      success: true,
      data: damageReportsData,
    });
  } catch (error) {
    console.error('Damage reports fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch damage reports' },
      { status: 500 }
    );
  }
}
