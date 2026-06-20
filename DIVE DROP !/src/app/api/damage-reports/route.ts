import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EquipmentService } from '@/lib/equipment/equipment-service';

export async function GET(request: NextRequest) {
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
    const scope = searchParams.get('scope'); // 'pending' or 'all'

    const service = new EquipmentService(supabase);

    let reports;
    if (scope === 'pending') {
      reports = await service.getListerPendingDamageReports(userId);
    } else {
      reports = await service.getAllDamageReports();
    }

    return NextResponse.json(reports);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    );
  }
}
