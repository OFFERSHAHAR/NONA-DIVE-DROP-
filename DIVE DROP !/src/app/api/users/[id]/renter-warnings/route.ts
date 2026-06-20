import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EquipmentService } from '@/lib/equipment/equipment-service';

/**
 * GET /api/users/[id]/renter-warnings
 * Get warnings about a specific renter for a lister
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const renterId = searchParams.get('renter_id');

    if (!renterId) {
      return NextResponse.json(
        { error: 'renter_id parameter required' },
        { status: 400 }
      );
    }

    const service = new EquipmentService(supabase);
    const warnings = await service.getListerRenterWarnings(userId, renterId);

    return NextResponse.json(warnings);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    );
  }
}
