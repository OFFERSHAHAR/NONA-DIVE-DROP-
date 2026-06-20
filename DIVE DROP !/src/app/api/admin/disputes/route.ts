import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const disputesData = [];

    return NextResponse.json({
      success: true,
      data: disputesData,
    });
  } catch (error) {
    console.error('Disputes fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disputes' },
      { status: 500 }
    );
  }
}
