import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();
    const { message } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // In a real implementation:
    // 1. Send email/notification to user
    // 2. Log warning in user's history
    // 3. Store warning timestamp

    return NextResponse.json({
      success: true,
      message: 'Warning sent to user',
    });
  } catch (error) {
    console.error('Send warning error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send warning' },
      { status: 500 }
    );
  }
}
