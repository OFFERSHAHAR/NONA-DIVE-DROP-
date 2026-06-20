import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/equipment - Get all equipment
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you would fetch from Supabase
    // For now, returning mock data structure
    const equipmentData = [
      {
        id: '1',
        ownerId: 'owner1',
        ownerName: 'John Diver',
        type: 'Regulator',
        name: 'Scuba Pro MK2',
        description: 'Professional diving regulator',
        status: 'available',
        rentalPrice: 25.0,
        images: [],
        rentalHistory: [],
        damageReports: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: equipmentData,
    });
  } catch (error) {
    console.error('Equipment fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
