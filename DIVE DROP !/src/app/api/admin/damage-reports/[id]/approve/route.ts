import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { repairCost } = body;

    if (!repairCost || repairCost <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid repair cost' },
        { status: 400 }
      );
    }

    // In a real implementation:
    // 1. Update damage report status to 'approved'
    // 2. Set repair cost
    // 3. Charge renter
    // 4. Flag user as problematic if needed
    // 5. Send notifications

    return NextResponse.json({
      success: true,
      message: 'Damage report approved',
    });
  } catch (error) {
    console.error('Approve damage report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve damage report' },
      { status: 500 }
    );
  }
}
