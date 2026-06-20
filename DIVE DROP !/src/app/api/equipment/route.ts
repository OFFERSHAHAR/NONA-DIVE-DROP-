import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { EquipmentService } from '@/lib/equipment/equipment-service';
import { equipmentCreateSchema, equipmentFilterSchema } from '@/lib/equipment/schemas';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via Supabase session (not header-based)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = equipmentCreateSchema.parse(body);

    const service = new EquipmentService(supabase);
    const equipment = await service.createEquipment(user.id, validated);

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
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listerId = searchParams.get('lister_id');

    if (!listerId) {
      return NextResponse.json(
        { error: 'lister_id parameter required' },
        { status: 400 }
      );
    }

    // Verify user owns this lister equipment or is admin
    if (listerId !== user.id) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role)) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot view other users equipment' },
          { status: 403 }
        );
      }
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
