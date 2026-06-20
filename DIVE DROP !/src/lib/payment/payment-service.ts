import { createClient } from '@/lib/supabase/server';
import {
  PaymentPackage,
  PackageItem,
  ProviderConfirmation,
  CreatePackageRequest,
  PackageDetail,
} from '@/types/payment';

/**
 * Payment service - handles package creation, confirmations, and status tracking
 */

export async function createPackage(request: CreatePackageRequest): Promise<PaymentPackage> {
  const supabase = await createClient();

  // Calculate total amount
  const totalAmount = request.items.reduce((sum, item) => sum + item.price, 0);

  try {
    // Create payment package
    const { data: packageData, error: packageError } = await supabase
      .from('payment_packages')
      .insert([
        {
          customer_id: request.customer_id,
          status: 'pending_confirmations',
          total_amount: totalAmount,
        },
      ])
      .select()
      .single();

    if (packageError) {
      throw new Error(`Failed to create package: ${packageError.message}`);
    }

    // Create package items and provider confirmations
    const itemsToInsert = request.items.map(item => ({
      package_id: packageData.id,
      provider_id: item.provider_id,
      service_name: item.service_name,
      service_category: item.service_category,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from('package_items')
      .insert(itemsToInsert);

    if (itemsError) {
      throw new Error(`Failed to create package items: ${itemsError.message}`);
    }

    // Create confirmation records (one per provider)
    const uniqueProviders = [...new Set(request.items.map(item => item.provider_id))];
    const confirmationsToInsert = uniqueProviders.map(providerId => ({
      package_id: packageData.id,
      provider_id: providerId,
      status: 'pending',
    }));

    const { error: confirmError } = await supabase
      .from('provider_confirmations')
      .insert(confirmationsToInsert);

    if (confirmError) {
      throw new Error(`Failed to create confirmations: ${confirmError.message}`);
    }

    return packageData;
  } catch (error) {
    console.error('Error in createPackage:', error);
    throw error;
  }
}

/**
 * Get complete package details with items and confirmations
 */
export async function getPackageDetails(packageId: string): Promise<PackageDetail> {
  const supabase = await createClient();

  try {
    // Get package
    const { data: packageData, error: packageError } = await supabase
      .from('payment_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (packageError || !packageData) {
      throw new Error(`Package not found: ${packageError?.message}`);
    }

    // Get items
    const { data: items, error: itemsError } = await supabase
      .from('package_items')
      .select('*')
      .eq('package_id', packageId);

    if (itemsError) {
      throw new Error(`Failed to fetch items: ${itemsError.message}`);
    }

    // Get confirmations
    const { data: confirmations, error: confirmError } = await supabase
      .from('provider_confirmations')
      .select('*')
      .eq('package_id', packageId);

    if (confirmError) {
      throw new Error(`Failed to fetch confirmations: ${confirmError.message}`);
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', packageData.customer_id)
      .single();

    return {
      ...packageData,
      items: items || [],
      confirmations: confirmations || [],
      customer,
    };
  } catch (error) {
    console.error('Error in getPackageDetails:', error);
    throw error;
  }
}

/**
 * Check if all providers have confirmed payment
 */
export async function areAllConfirmed(packageId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('provider_confirmations')
      .select('status')
      .eq('package_id', packageId);

    if (error) {
      throw new Error(`Failed to check confirmations: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return false;
    }

    return data.every(conf => conf.status === 'confirmed');
  } catch (error) {
    console.error('Error in areAllConfirmed:', error);
    throw error;
  }
}

/**
 * Confirm payment by provider
 */
export async function confirmPayment(
  confirmationId: string,
  userId: string
): Promise<ProviderConfirmation> {
  const supabase = await createClient();

  try {
    // Get confirmation to find package_id
    const { data: confirmation, error: getError } = await supabase
      .from('provider_confirmations')
      .select('*')
      .eq('id', confirmationId)
      .single();

    if (getError || !confirmation) {
      throw new Error(`Confirmation not found: ${getError?.message}`);
    }

    // Update confirmation
    const { data: updated, error: updateError } = await supabase
      .from('provider_confirmations')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by_user_id: userId,
      })
      .eq('id', confirmationId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to confirm payment: ${updateError.message}`);
    }

    // Check if all confirmations done
    const allConfirmed = await areAllConfirmed(confirmation.package_id);

    if (allConfirmed) {
      // Mark package as completed
      await supabase
        .from('payment_packages')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', confirmation.package_id);
    }

    return updated;
  } catch (error) {
    console.error('Error in confirmPayment:', error);
    throw error;
  }
}

/**
 * Get remaining confirmations for a package
 */
export async function getRemainingConfirmations(packageId: string): Promise<number> {
  const supabase = await createClient();

  try {
    const { count, error } = await supabase
      .from('provider_confirmations')
      .select('*', { count: 'exact' })
      .eq('package_id', packageId)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to get remaining confirmations: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getRemainingConfirmations:', error);
    throw error;
  }
}
