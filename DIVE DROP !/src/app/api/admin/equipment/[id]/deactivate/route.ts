import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/equipment/[id]/deactivate
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // In a real implementation, you would update Supabase
    // const supabase = createAdminClient();
    // await supabase
    //   .from('equipment')
    //   .update({ is_active: false })
    //   .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Equipment deactivated',
    });
  } catch (error) {
    console.error('Equipment deactivation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate equipment' },
      { status: 500 }
    );
  }
}
