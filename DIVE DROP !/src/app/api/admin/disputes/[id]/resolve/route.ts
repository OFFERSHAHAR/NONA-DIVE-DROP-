import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { resolution, resolutionDetails } = body;

    const validResolutions = ['charge_renter', 'refund_lister', 'split'];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json(
        { success: false, error: 'Invalid resolution' },
        { status: 400 }
      );
    }

    // In a real implementation:
    // 1. Update dispute status to 'resolved'
    // 2. Process payment according to resolution
    // 3. Send notifications to both parties
    // 4. Log dispute resolution
    // 5. Update user reputation if needed

    return NextResponse.json({
      success: true,
      message: 'Dispute resolved',
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}
