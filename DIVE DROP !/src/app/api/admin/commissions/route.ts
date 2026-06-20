import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const commissionsData = [];

    return NextResponse.json({
      success: true,
      data: commissionsData,
    });
  } catch (error) {
    console.error('Commissions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commissions' },
      { status: 500 }
    );
  }
}
