import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // In a real implementation:
    // 1. Update damage report status to 'rejected'
    // 2. Store rejection reason
    // 3. Send notification to renter
    // 4. Refund renter if payment was made

    return NextResponse.json({
      success: true,
      message: 'Damage report rejected',
    });
  } catch (error) {
    console.error('Reject damage report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject damage report' },
      { status: 500 }
    );
  }
}
