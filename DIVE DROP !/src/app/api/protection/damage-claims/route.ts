/**
 * POST /api/protection/damage-claims
 * File a damage claim (lister action)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplaintService } from '@/lib/protection/complaint-service';

interface FileDamageClaimRequest {
  renter_id: string;
  booking_id: string;
  item_name: string;
  item_value: number;
  damage_type: 'broken' | 'lost' | 'damaged' | 'wear_and_tear';
  damage_description: string;
  estimated_repair_cost: number;
  claim_amount: number;
  photos?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user (lister claiming damages)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: FileDamageClaimRequest = await request.json();

    // Validate request
    if (
      !body.renter_id ||
      !body.booking_id ||
      !body.item_name ||
      !body.damage_type ||
      !body.damage_description
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (body.claim_amount <= 0 || body.estimated_repair_cost <= 0) {
      return NextResponse.json(
        { error: 'Amounts must be positive' },
        { status: 400 }
      );
    }

    const complaintService = new ComplaintService();
    const claim = await complaintService.fileDamageClaim(
      currentUser.id,
      body.renter_id,
      body.booking_id,
      body.item_name,
      body.item_value,
      body.damage_type,
      body.damage_description,
      body.estimated_repair_cost,
      body.claim_amount,
      body.photos
    );

    return NextResponse.json(claim, { status: 201 });
  } catch (error: any) {
    console.error('Error filing damage claim:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to file damage claim' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/protection/damage-claims
 * Get damage claims (as lister or renter)
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'filed'; // 'filed', 'against', or 'all'

    const complaintService = new ComplaintService();

    if (type === 'filed') {
      // Claims filed by user (as lister)
      const claims = await complaintService.getDamageClaimsForLister(
        currentUser.id
      );
      return NextResponse.json({
        damage_claims: claims,
        total: claims.length,
      });
    } else if (type === 'against') {
      // Claims against user (as renter)
      const claims = await complaintService.getDamageClaimsAgainstUser(
        currentUser.id
      );
      return NextResponse.json({
        damage_claims: claims,
        total: claims.length,
      });
    }

    // Both
    const [filed, against] = await Promise.all([
      complaintService.getDamageClaimsForLister(currentUser.id),
      complaintService.getDamageClaimsAgainstUser(currentUser.id),
    ]);

    return NextResponse.json({
      claims_filed: filed,
      claims_against: against,
      total_filed: filed.length,
      total_against: against.length,
    });
  } catch (error) {
    console.error('Error fetching damage claims:', error);
    return NextResponse.json(
      { error: 'Failed to fetch damage claims' },
      { status: 500 }
    );
  }
}
