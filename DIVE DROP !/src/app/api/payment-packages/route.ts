import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CreatePackageRequestSchema } from '@/lib/payment/schemas';
import { createPackage } from '@/lib/payment/payment-service';
import { sendProviderNotifications } from '@/lib/payment/notification-service';
import { getPackageDetails } from '@/lib/payment/payment-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment-packages
 * Create a new payment package with multiple services
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();

    const validationResult = CreatePackageRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { customer_id, items } = validationResult.data;

    // Verify customer is authenticated user
    if (customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Can only create packages for authenticated user' },
        { status: 403 }
      );
    }

    // Verify all providers exist
    const providerIds = items.map(item => item.provider_id);
    const { data: providers, error: providerError } = await supabase
      .from('service_providers')
      .select('id')
      .in('id', providerIds);

    if (providerError || !providers || providers.length !== new Set(providerIds).size) {
      return NextResponse.json(
        { error: 'One or more providers not found' },
        { status: 400 }
      );
    }

    // Create package
    const packageData = await createPackage(validationResult.data);

    // Get full package details
    const packageDetail = await getPackageDetails(packageData.id);

    // Send notifications to providers
    await sendProviderNotifications(packageDetail);

    return NextResponse.json(
      {
        success: true,
        package: packageData,
        message: 'Package created and notifications sent to providers',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/payment-packages:', error);
    return NextResponse.json(
      { error: 'Failed to create package', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment-packages
 * List customer's payment packages
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get packages for user
    const { data, error } = await supabase
      .from('payment_packages')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ packages: data || [] });
  } catch (error) {
    console.error('Error in GET /api/payment-packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}
