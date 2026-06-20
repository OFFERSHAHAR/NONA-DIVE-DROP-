import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const validStatuses = ['reported', 'investigating', 'recovered', 'theft_filed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // In a real implementation:
    // 1. Update missing equipment status
    // 2. Update notes
    // 3. Send notifications to owner/renter
    // 4. If recovered, update equipment status back to available

    return NextResponse.json({
      success: true,
      message: 'Missing equipment status updated',
    });
  } catch (error) {
    console.error('Update missing equipment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
