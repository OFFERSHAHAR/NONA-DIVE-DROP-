/**
 * Get lister's invoices
 * GET /api/equipment/commissions/invoices
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

    // Get invoices with line items
    const { data: invoices, error } = await supabase
      .from('rental_invoices')
      .select(`
        id,
        invoice_number,
        invoice_month,
        total_rental_cost_cents,
        total_commission_cents,
        total_damage_charges_cents,
        rental_count,
        due_date,
        status,
        sent_at,
        viewed_at,
        payment_received_at,
        payment_amount_cents,
        rental_invoice_line_items (
          id,
          item_type,
          description,
          amount_cents
        )
      `)
      .eq('lister_id', user.id)
      .order('invoice_month', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    // Format response
    const formattedInvoices = invoices?.map((inv) => {
      const totalCents =
        (inv.total_commission_cents || 0) +
        (inv.total_damage_charges_cents || 0);

      let statusBadge = inv.status;
      let actionRequired = false;

      if (inv.status === 'overdue') {
        statusBadge = '⚠️ OVERDUE';
        actionRequired = true;
      } else if (inv.status === 'sent' || inv.status === 'viewed') {
        statusBadge = '📬 PENDING PAYMENT';
        actionRequired = true;
      }

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        period: {
          month: new Date(inv.invoice_month).toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
          }),
          date: inv.invoice_month,
        },
        summary: {
          rental_count: inv.rental_count,
          rental_commission: {
            cents: inv.total_commission_cents || 0,
            display: `₪${((inv.total_commission_cents || 0) / 100).toFixed(2)}`,
          },
          damage_charges: {
            cents: inv.total_damage_charges_cents || 0,
            display: `₪${((inv.total_damage_charges_cents || 0) / 100).toFixed(2)}`,
          },
          total: {
            cents: totalCents,
            display: `₪${(totalCents / 100).toFixed(2)}`,
          },
        },
        timeline: {
          issued_date: inv.created_at || inv.invoice_month,
          sent_date: inv.sent_at,
          viewed_date: inv.viewed_at,
          due_date: inv.due_date,
          paid_date: inv.payment_received_at,
        },
        status: {
          current: inv.status,
          badge: statusBadge,
          action_required: actionRequired,
          paid: inv.status === 'paid',
        },
        payment: {
          status: inv.payment_received_at ? 'paid' : 'pending',
          amount_paid: inv.payment_amount_cents
            ? {
                cents: inv.payment_amount_cents,
                display: `₪${(inv.payment_amount_cents / 100).toFixed(2)}`,
              }
            : null,
          paid_at: inv.payment_received_at,
        },
        line_items: inv.rental_invoice_line_items?.map((item) => ({
          type: item.item_type,
          description: item.description,
          amount: {
            cents: item.amount_cents,
            display: `₪${(item.amount_cents / 100).toFixed(2)}`,
          },
        })) || [],
      };
    }) || [];

    // Calculate summary stats
    const totalOwed = formattedInvoices.reduce((sum, inv) => {
      return inv.status.paid ? sum : sum + inv.summary.total.cents;
    }, 0);

    const paidTotal = formattedInvoices.reduce((sum, inv) => {
      return inv.status.paid ? sum + inv.summary.total.cents : sum;
    }, 0);

    return NextResponse.json(
      {
        success: true,
        summary: {
          total_invoices: formattedInvoices.length,
          outstanding: {
            cents: totalOwed,
            display: `₪${(totalOwed / 100).toFixed(2)}`,
          },
          total_paid: {
            cents: paidTotal,
            display: `₪${(paidTotal / 100).toFixed(2)}`,
          },
          overdue_count: formattedInvoices.filter(
            (inv) => inv.status.current === 'overdue'
          ).length,
          pending_count: formattedInvoices.filter(
            (inv) => inv.status.action_required
          ).length,
        },
        invoices: formattedInvoices,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Invoices fetch error:', error);

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
