import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // In a real implementation:
    // 1. Generate invoice PDF
    // 2. Send email with invoice
    // 3. Log email send

    return NextResponse.json({
      success: true,
      message: 'Invoice sent to lister',
    });
  } catch (error) {
    console.error('Send invoice error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}
