import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EquipmentService } from '@/lib/equipment/equipment-service';
import { equipmentStatusUpdateSchema } from '@/lib/equipment/schemas';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const body = await request.json();
    const validated = equipmentStatusUpdateSchema.parse(body);

    const service = new EquipmentService(supabase);
    const updated = await service.updateEquipmentStatus(params.id, userId, validated);

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    );
  }
}
