import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const missingEquipmentData = [];

    return NextResponse.json({
      success: true,
      data: missingEquipmentData,
    });
  } catch (error) {
    console.error('Missing equipment fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch missing equipment' },
      { status: 500 }
    );
  }
}
