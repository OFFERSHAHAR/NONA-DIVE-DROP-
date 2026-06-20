/**
 * Get lister's commission account summary
 * GET /api/equipment/commissions/my-account
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

    // Get current user (lister)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Get account balance
    const { data: accountBalance, error: balanceError } = await supabase
      .from('lister_account_balance')
      .select('*')
      .eq('lister_id', user.id)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error('Error fetching account balance:', balanceError);
    }

    // If no balance record, create one
    if (!accountBalance) {
      await supabase.from('lister_account_balance').insert({
        lister_id: user.id,
        balance_owed_cents: 0,
      });
    }

    // Get recent commissions
    const { data: recentCommissions } = await supabase
      .from('rental_commissions')
      .select(`
        id,
        rental_id,
        rental_cost_cents,
        commission_cents,
        commission_rate,
        status,
        created_at,
        equipment_rentals (
          id,
          start_date,
          end_date,
          equipment_listings (
            equipment (
              name,
              category
            )
          )
        )
      `)
      .eq('lister_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get stats for this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: monthlyStats } = await supabase
      .from('rental_commissions')
      .select('commission_cents, status')
      .eq('lister_id', user.id)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    // Calculate monthly totals
    let monthlyCommissionTotal = 0;
    let monthlyPaid = 0;
    let monthlyPending = 0;

    if (monthlyStats) {
      monthlyStats.forEach((stat) => {
        monthlyCommissionTotal += stat.commission_cents;
        if (stat.status === 'paid') {
          monthlyPaid += stat.commission_cents;
        } else {
          monthlyPending += stat.commission_cents;
        }
      });
    }

    // Get pending invoices
    const { data: pendingInvoices } = await supabase
      .from('rental_invoices')
      .select('id, invoice_number, total_commission_cents, due_date, status')
      .eq('lister_id', user.id)
      .in('status', ['sent', 'viewed', 'overdue'])
      .order('due_date', { ascending: true });

    return NextResponse.json(
      {
        success: true,
        account: {
          lister_id: user.id,
          balance_owed: {
            cents: accountBalance?.balance_owed_cents || 0,
            display: `₪${((accountBalance?.balance_owed_cents || 0) / 100).toFixed(2)}`,
          },
          unpaid_commissions: {
            cents: accountBalance?.unpaid_commissions_cents || 0,
            display: `₪${((accountBalance?.unpaid_commissions_cents || 0) / 100).toFixed(2)}`,
          },
          unpaid_damage_charges: {
            cents: accountBalance?.unpaid_damage_charges_cents || 0,
            display: `₪${((accountBalance?.unpaid_damage_charges_cents || 0) / 100).toFixed(2)}`,
          },
          lifetime_stats: {
            total_rental_volume: {
              cents: accountBalance?.lifetime_rental_volume_cents || 0,
              display: `₪${((accountBalance?.lifetime_rental_volume_cents || 0) / 100).toFixed(2)}`,
            },
            total_commission_paid: {
              cents: accountBalance?.lifetime_commission_paid_cents || 0,
              display: `₪${((accountBalance?.lifetime_commission_paid_cents || 0) / 100).toFixed(2)}`,
            },
          },
          last_payment: accountBalance?.last_payment_at,
          is_suspended: accountBalance?.is_suspended || false,
        },
        this_month: {
          period: {
            start: monthStart.toISOString().split('T')[0],
            end: monthEnd.toISOString().split('T')[0],
          },
          total_commission: {
            cents: monthlyCommissionTotal,
            display: `₪${(monthlyCommissionTotal / 100).toFixed(2)}`,
          },
          paid: {
            cents: monthlyPaid,
            display: `₪${(monthlyPaid / 100).toFixed(2)}`,
          },
          pending: {
            cents: monthlyPending,
            display: `₪${(monthlyPending / 100).toFixed(2)}`,
          },
          rental_count: monthlyStats?.length || 0,
        },
        pending_invoices: pendingInvoices?.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: {
            cents: inv.total_commission_cents,
            display: `₪${(inv.total_commission_cents / 100).toFixed(2)}`,
          },
          due_date: inv.due_date,
          status: inv.status,
          action: inv.status === 'overdue' ? 'PAY NOW - OVERDUE' : 'PAY',
        })) || [],
        recent_commissions: recentCommissions?.map((comm) => ({
          id: comm.id,
          rental_id: comm.rental_id,
          equipment: comm.equipment_rentals?.equipment_listings?.equipment?.name,
          category: comm.equipment_rentals?.equipment_listings?.equipment?.category,
          rental_period: {
            start: comm.equipment_rentals?.start_date,
            end: comm.equipment_rentals?.end_date,
          },
          rental_cost: {
            cents: comm.rental_cost_cents,
            display: `₪${(comm.rental_cost_cents / 100).toFixed(2)}`,
          },
          commission_rate: `${(comm.commission_rate * 100).toFixed(0)}%`,
          commission_amount: {
            cents: comm.commission_cents,
            display: `₪${(comm.commission_cents / 100).toFixed(2)}`,
          },
          status: comm.status,
          created: comm.created_at,
        })) || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account fetch error:', error);

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
