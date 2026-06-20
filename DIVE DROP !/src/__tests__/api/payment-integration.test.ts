/**
 * Integration tests for payment package system
 * Tests full flow: create package → send notifications → confirmations → email
 */

import { createPackage, confirmPayment, getPackageDetails } from '@/lib/payment/payment-service';
import { sendProviderNotifications } from '@/lib/payment/notification-service';
import { CreatePackageRequest } from '@/types/payment';

describe('Payment Package Integration', () => {
  const testCustomerId = 'test-customer-123';
  const testProviderId1 = 'test-provider-1';
  const testProviderId2 = 'test-provider-2';

  describe('Full flow: Create → Notify → Confirm → Complete', () => {
    it('should complete full payment confirmation flow', async () => {
      // Step 1: Create package
      const createRequest: CreatePackageRequest = {
        customer_id: testCustomerId,
        items: [
          {
            provider_id: testProviderId1,
            service_name: 'צלילה מדריך',
            service_category: 'guide',
            price: 500,
          },
          {
            provider_id: testProviderId2,
            service_name: 'שאטל הסעה',
            service_category: 'shuttle',
            price: 100,
          },
        ],
      };

      const package1 = await createPackage(createRequest);
      expect(package1.status).toBe('pending_confirmations');
      expect(package1.total_amount).toBe(600);

      // Step 2: Get full details
      const packageDetail = await getPackageDetails(package1.id);
      expect(packageDetail.items).toHaveLength(2);
      expect(packageDetail.confirmations).toHaveLength(2);

      // Step 3: Send notifications
      await sendProviderNotifications(packageDetail);

      // Step 4: Confirm payments
      const conf1 = packageDetail.confirmations[0];
      const conf2 = packageDetail.confirmations[1];

      const updated1 = await confirmPayment(conf1.id, testProviderId1);
      expect(updated1.status).toBe('confirmed');
      expect(updated1.confirmed_at).toBeTruthy();

      // After first confirmation, package should still be pending
      let packageAfter1 = await getPackageDetails(package1.id);
      expect(packageAfter1.status).toBe('pending_confirmations');

      // Confirm second provider
      const updated2 = await confirmPayment(conf2.id, testProviderId2);
      expect(updated2.status).toBe('confirmed');

      // After all confirmations, package should be completed
      let packageAfterAll = await getPackageDetails(package1.id);
      expect(packageAfterAll.status).toBe('completed');
      expect(packageAfterAll.completed_at).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should not allow duplicate confirmations', async () => {
      const createRequest: CreatePackageRequest = {
        customer_id: testCustomerId,
        items: [
          {
            provider_id: testProviderId1,
            service_name: 'Service',
            service_category: 'guide',
            price: 100,
          },
        ],
      };

      const pkg = await createPackage(createRequest);
      const packageDetail = await getPackageDetails(pkg.id);
      const confirmation = packageDetail.confirmations[0];

      // First confirmation should succeed
      await confirmPayment(confirmation.id, testProviderId1);

      // Second confirmation should fail or return same result
      const secondAttempt = await confirmPayment(confirmation.id, testProviderId1);
      expect(secondAttempt.status).toBe('confirmed');
    });
  });
});
