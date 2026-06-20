import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EquipmentService } from '@/lib/equipment/equipment-service';
import { equipmentCreateSchema, equipmentFilterSchema } from '@/lib/equipment/schemas';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const session = request.headers.get('x-user-id');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = equipmentCreateSchema.parse(body);

    const service = new EquipmentService(supabase);
    const equipment = await service.createEquipment(session, validated);

    return NextResponse.json(equipment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const listerId = searchParams.get('lister_id');

    if (!listerId) {
      return NextResponse.json(
        { error: 'lister_id parameter required' },
        { status: 400 }
      );
    }

    const filters = {
      status: searchParams.get('status') || undefined,
      equipment_type: searchParams.get('equipment_type') || undefined,
      condition_rating_min: searchParams.get('condition_rating_min')
        ? parseInt(searchParams.get('condition_rating_min')!)
        : undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'created_at',
      sort_order: (searchParams.get('sort_order') as any) || 'desc'
    };

    const service = new EquipmentService(supabase);
    const equipment = await service.getListerEquipment(listerId, filters);

    return NextResponse.json(equipment);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    );
  }
}
