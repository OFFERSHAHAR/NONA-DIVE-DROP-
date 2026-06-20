import { createClient } from '@/lib/supabase/server';
import { ProviderNotification, PaymentConfirmationNotificationData, PackageDetail } from '@/types/payment';

/**
 * Notification service - handles push notifications to providers
 */

export async function sendProviderNotifications(packageDetail: PackageDetail): Promise<void> {
  const supabase = await createClient();

  try {
    // Get unique providers
    const uniqueProviders = [...new Set(packageDetail.items.map(item => item.provider_id))];

    // Get customer name
    const customerName = packageDetail.customer
      ? `${packageDetail.customer.first_name} ${packageDetail.customer.last_name}`
      : 'Customer';

    // Create notification for each provider
    const notificationsToInsert = uniqueProviders.map(providerId => {
      // Get items for this provider
      const providerItems = packageDetail.items.filter(item => item.provider_id === providerId);
      const providerTotal = providerItems.reduce((sum, item) => sum + item.price, 0);

      const notificationData: PaymentConfirmationNotificationData = {
        items: providerItems.map(item => ({
          service_name: item.service_name,
          service_category: item.service_category,
          price: item.price,
        })),
        total: providerTotal,
        customer_name: customerName,
        confirmation_id: packageDetail.confirmations.find(c => c.provider_id === providerId)?.id || '',
        action_required: true,
      };

      return {
        provider_id: providerId,
        package_id: packageDetail.id,
        type: 'payment_confirmation',
        data: notificationData,
      };
    });

    const { error } = await supabase
      .from('provider_notifications')
      .insert(notificationsToInsert);

    if (error) {
      throw new Error(`Failed to send notifications: ${error.message}`);
    }

    console.log(`✅ Sent notifications to ${uniqueProviders.length} providers`);
  } catch (error) {
    console.error('Error in sendProviderNotifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<ProviderNotification> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('provider_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to mark notification as read: ${error?.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in markNotificationRead:', error);
    throw error;
  }
}

/**
 * Get unread notifications for provider
 */
export async function getUnreadNotifications(providerId: string): Promise<ProviderNotification[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('provider_notifications')
      .select('*')
      .eq('provider_id', providerId)
      .is('read_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUnreadNotifications:', error);
    throw error;
  }
}

/**
 * Subscribe to provider notifications in real-time
 */
export function subscribeToProviderNotifications(
  providerId: string,
  callback: (notification: ProviderNotification) => void
) {
  const supabase = createClient();

  const subscription = supabase
    .channel(`provider-notifications:${providerId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'provider_notifications',
        filter: `provider_id=eq.${providerId}`,
      },
      (payload: any) => {
        callback(payload.new as ProviderNotification);
      }
    )
    .subscribe();

  return subscription;
}
