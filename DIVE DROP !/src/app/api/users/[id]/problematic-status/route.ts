import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EquipmentService } from '@/lib/equipment/equipment-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const service = new EquipmentService(supabase);
    const status = await service.getUserProblematicStatus(params.id);

    return NextResponse.json({
      user_id: params.id,
      has_issues: status.length > 0,
      can_rent: await service.canUserRent(params.id),
      issues: status
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    );
  }
}
