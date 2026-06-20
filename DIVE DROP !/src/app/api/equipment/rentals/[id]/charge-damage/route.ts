/**
 * Report and charge for equipment damage
 * POST /api/equipment/rentals/[id]/charge-damage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { calculateCommission } from '@/lib/rentals/commission';

export const runtime = 'nodejs';

const damageReportSchema = z.object({
  damage_description: z.string().min(10).max(1000),
  severity: z.enum(['minor', 'moderate', 'severe', 'total_loss']),
  repair_cost_cents: z.number().int().positive(),
  replacement_cost_cents: z.number().int().positive().optional(),
  charge_cents: z.number().int().positive().optional(), // If lister wants to charge less
  photo_evidence_urls: z.array(z.string().url()).optional(),
  notes: z.string().max(500).optional(),
});

type RequestBody = z.infer<typeof damageReportSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rentalId = params.id;
    const body: RequestBody = await request.json();

    // Validate input
    const validationResult = damageReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      damage_description,
      severity,
      repair_cost_cents,
      replacement_cost_cents,
      charge_cents,
      photo_evidence_urls,
      notes,
    } = validationResult.data;

    // Get Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user (lister reporting damage)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Get rental details
    const { data: rental, error: rentalError } = await supabase
      .from('equipment_rentals')
      .select('id, renter_id, lister_id, status, commission_rate')
      .eq('id', rentalId)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      );
    }

    // Verify lister is the one reporting damage
    if (rental.lister_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the lister can report damage' },
        { status: 403 }
      );
    }

    // Verify rental is returned (can't charge for damage if still active)
    if (!['returned', 'cancelled'].includes(rental.status)) {
      return NextResponse.json(
        {
          error:
            'Can only report damage after equipment is returned or rental is cancelled',
        },
        { status: 400 }
      );
    }

    // Determine final charge
    const finalChargeCents = charge_cents || repair_cost_cents;

    // Create damage assessment
    const { data: damageAssessment, error: damageError } = await supabase
      .from('rental_damage_assessments')
      .insert({
        rental_id: rentalId,
        lister_id: rental.lister_id,
        renter_id: rental.renter_id,
        damage_description,
        severity,
        repair_cost_cents,
        replacement_cost_cents,
        charge_cents: finalChargeCents,
        assessed_by_lister_id: user.id,
        status: 'assessed',
        charge_issued_at: new Date().toISOString(),
        charge_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 7 days from now
        photo_evidence: photo_evidence_urls ? JSON.stringify(photo_evidence_urls) : null,
        notes,
      })
      .select()
      .single();

    if (damageError || !damageAssessment) {
      return NextResponse.json(
        { error: 'Failed to create damage assessment' },
        { status: 500 }
      );
    }

    // Calculate damage commission (commission also applies to damage charges)
    const damageCommissionCalc = calculateCommission(finalChargeCents, rental.commission_rate);

    // Update lister account balance with damage charges and commission
    const { data: accountBalance } = await supabase
      .from('lister_account_balance')
      .select('unpaid_damage_charges_cents, balance_owed_cents')
      .eq('lister_id', rental.lister_id)
      .single();

    if (accountBalance) {
      await supabase
        .from('lister_account_balance')
        .update({
          unpaid_damage_charges_cents:
            (accountBalance.unpaid_damage_charges_cents || 0) + damageCommissionCalc.commissionCents,
          balance_owed_cents:
            (accountBalance.balance_owed_cents || 0) + damageCommissionCalc.commissionCents,
        })
        .eq('lister_id', rental.lister_id);
    }

    // Add damage commission to the rental commission record
    const { data: commission } = await supabase
      .from('rental_commissions')
      .select('id')
      .eq('rental_id', rentalId)
      .single();

    if (commission) {
      await supabase
        .from('rental_commissions')
        .update({
          damage_commission_cents: damageCommissionCalc.commissionCents,
        })
        .eq('id', commission.id);
    }

    return NextResponse.json(
      {
        success: true,
        damage_assessment: {
          id: damageAssessment.id,
          rental_id: rentalId,
          damage_description,
          severity,
          repair_cost: {
            cents: repair_cost_cents,
            display: `₪${(repair_cost_cents / 100).toFixed(2)}`,
          },
          charge_issued: {
            cents: finalChargeCents,
            display: `₪${(finalChargeCents / 100).toFixed(2)}`,
          },
          commission_on_damage: {
            rate: `${(rental.commission_rate * 100).toFixed(0)}%`,
            cents: damageCommissionCalc.commissionCents,
            display: `₪${(damageCommissionCalc.commissionCents / 100).toFixed(2)}`,
          },
          total_owed_to_dive_drop: {
            cents: damageCommissionCalc.commissionCents,
            display: `₪${(damageCommissionCalc.commissionCents / 100).toFixed(2)}`,
          },
          charge_due_date: damageAssessment.charge_due_date,
          status: damageAssessment.status,
          message:
            'Damage charge has been recorded. Renter will be notified. The commission on this damage will be added to your next invoice.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Damage report error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
