/**
 * Equipment Rental & Commission Analytics Dashboard
 * GET /api/admin/equipment/analytics
 * Admin only - revenue tracking and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
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

    // Get current user and verify admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    // const { data: adminRole } = await supabase
    //   .from('admin_roles')
    //   .select('role')
    //   .eq('user_id', user.id)
    //   .single();
    //
    // if (!adminRole) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized: Admin access required' },
    //     { status: 403 }
    //   );
    // }

    const urlParams = new URL(request.url).searchParams;
    const period = urlParams.get('period') || 'month'; // 'week', 'month', 'year'

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get all rentals in period
    const { data: rentals } = await supabase
      .from('equipment_rentals')
      .select('id, rental_cost_cents, commission_rate, status, created_at')
      .gte('created_at', startDate.toISOString());

    // Get all commissions in period
    const { data: commissions } = await supabase
      .from('rental_commissions')
      .select('commission_cents, status, created_at')
      .gte('created_at', startDate.toISOString());

    // Get damage assessments in period
    const { data: damages } = await supabase
      .from('rental_damage_assessments')
      .select('charge_cents, status, created_at')
      .gte('created_at', startDate.toISOString());

    // Get top equipment
    const { data: topEquipment } = await supabase
      .from('equipment_listings')
      .select('id, equipment(name, category), rental_count, rating_average')
      .order('rental_count', { ascending: false })
      .limit(5);

    // Get top listers
    const { data: topListers } = await supabase
      .from('lister_account_balance')
      .select('lister_id, lifetime_rental_volume_cents, lifetime_commission_paid_cents')
      .order('lifetime_rental_volume_cents', { ascending: false })
      .limit(5);

    // Calculate totals
    const totalRentalRevenue = (rentals || []).reduce(
      (sum, r) => sum + r.rental_cost_cents,
      0
    );
    const totalCommissions = (commissions || []).reduce(
      (sum, c) => sum + c.commission_cents,
      0
    );
    const paidCommissions = (commissions || [])
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.commission_cents, 0);
    const pendingCommissions = (commissions || [])
      .filter((c) => c.status === 'pending' || c.status === 'invoiced')
      .reduce((sum, c) => sum + c.commission_cents, 0);

    const totalDamageCharges = (damages || []).reduce((sum, d) => sum + d.charge_cents, 0);
    const completedRentals = (rentals || []).filter(
      (r) => r.status === 'returned'
    ).length;
    const activeRentals = (rentals || []).filter((r) => r.status === 'active').length;
    const pendingRentals = (rentals || []).filter((r) => r.status === 'pending').length;

    return NextResponse.json(
      {
        success: true,
        period: {
          type: period,
          start: startDate.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
        },
        summary: {
          total_rental_revenue: {
            cents: totalRentalRevenue,
            display: `₪${(totalRentalRevenue / 100).toFixed(2)}`,
          },
          total_commissions: {
            cents: totalCommissions,
            display: `₪${(totalCommissions / 100).toFixed(2)}`,
          },
          commission_breakdown: {
            paid: {
              cents: paidCommissions,
              display: `₪${(paidCommissions / 100).toFixed(2)}`,
              percentage: totalCommissions > 0 ? ((paidCommissions / totalCommissions) * 100).toFixed(1) : 0,
            },
            pending: {
              cents: pendingCommissions,
              display: `₪${(pendingCommissions / 100).toFixed(2)}`,
              percentage: totalCommissions > 0 ? ((pendingCommissions / totalCommissions) * 100).toFixed(1) : 0,
            },
          },
          total_damage_charges: {
            cents: totalDamageCharges,
            display: `₪${(totalDamageCharges / 100).toFixed(2)}`,
          },
        },
        rental_metrics: {
          completed_rentals: completedRentals,
          active_rentals: activeRentals,
          pending_rentals: pendingRentals,
          total_rentals: rentals?.length || 0,
          average_commission_rate: rentals && rentals.length > 0
            ? ((rentals.reduce((sum, r) => sum + r.commission_rate, 0) / rentals.length) * 100).toFixed(1)
            : 0,
        },
        top_equipment: (topEquipment || []).map((eq) => ({
          id: eq.id,
          name: eq.equipment?.name,
          category: eq.equipment?.category,
          rental_count: eq.rental_count,
          rating: eq.rating_average,
        })),
        top_listers: (topListers || []).map((lister, idx) => ({
          rank: idx + 1,
          lister_id: lister.lister_id,
          lifetime_volume: {
            cents: lister.lifetime_rental_volume_cents,
            display: `₪${(lister.lifetime_rental_volume_cents / 100).toFixed(2)}`,
          },
          lifetime_commission_paid: {
            cents: lister.lifetime_commission_paid_cents,
            display: `₪${(lister.lifetime_commission_paid_cents / 100).toFixed(2)}`,
          },
        })),
        daily_breakdown: generateDailyBreakdown(rentals, commissions, startDate, now),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Analytics fetch error:', error);

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

/**
 * Generate daily breakdown of revenue and commissions
 */
function generateDailyBreakdown(
  rentals: any[] | null,
  commissions: any[] | null,
  startDate: Date,
  endDate: Date
): Record<string, any> {
  const dailyData: Record<string, any> = {};

  // Initialize all dates in range
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dailyData[dateStr] = {
      revenue_cents: 0,
      commission_cents: 0,
      rental_count: 0,
    };
    current.setDate(current.getDate() + 1);
  }

  // Aggregate rental revenue
  (rentals || []).forEach((rental) => {
    const dateStr = rental.created_at.split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].revenue_cents += rental.rental_cost_cents;
      dailyData[dateStr].rental_count += 1;
    }
  });

  // Aggregate commissions
  (commissions || []).forEach((commission) => {
    const dateStr = commission.created_at.split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].commission_cents += commission.commission_cents;
    }
  });

  // Format for display
  const formatted: Record<string, any> = {};
  Object.entries(dailyData).forEach(([date, data]) => {
    formatted[date] = {
      revenue: {
        cents: data.revenue_cents,
        display: `₪${(data.revenue_cents / 100).toFixed(2)}`,
      },
      commission: {
        cents: data.commission_cents,
        display: `₪${(data.commission_cents / 100).toFixed(2)}`,
      },
      rental_count: data.rental_count,
    };
  });

  return formatted;
}
