import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EquipmentService } from '@/lib/equipment/equipment-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const service = new EquipmentService(supabase);
    const equipment = await service.getEquipment(id);

    return NextResponse.json(equipment);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    );
  }
}
