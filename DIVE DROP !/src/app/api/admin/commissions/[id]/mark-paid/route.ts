import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentMethod } = body;

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // In a real implementation:
    // 1. Update commission status to 'paid'
    // 2. Record payment date
    // 3. Send payment confirmation to lister
    // 4. Generate receipt

    return NextResponse.json({
      success: true,
      message: 'Commission marked as paid',
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark commission as paid' },
      { status: 500 }
    );
  }
}
