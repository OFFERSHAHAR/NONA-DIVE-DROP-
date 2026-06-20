import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/equipment/[id]/update-status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['available', 'in_rental', 'unavailable', 'damaged', 'missing'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // In a real implementation, you would update Supabase
    // const supabase = createAdminClient();
    // await supabase
    //   .from('equipment')
    //   .update({ status })
    //   .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Equipment status updated',
    });
  } catch (error) {
    console.error('Equipment update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update equipment' },
      { status: 500 }
    );
  }
}
