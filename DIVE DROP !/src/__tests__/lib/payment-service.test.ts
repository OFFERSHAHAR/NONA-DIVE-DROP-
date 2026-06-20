import { createPackage, getPackageDetails, areAllConfirmed } from '@/lib/payment/payment-service';
import { CreatePackageRequest } from '@/types/payment';

describe('PaymentService', () => {
  describe('createPackage', () => {
    it('creates a package with multiple items', async () => {
      const request: CreatePackageRequest = {
        customer_id: 'test-customer-id',
        items: [
          {
            provider_id: 'provider-1',
            service_name: 'צלילה מדריך',
            service_category: 'guide',
            price: 500,
          },
          {
            provider_id: 'provider-2',
            service_name: 'שאטל הסעה',
            service_category: 'shuttle',
            price: 100,
          },
        ],
      };

      const result = await createPackage(request);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending_confirmations');
      expect(result.total_amount).toBe(600);
    });

    it('calculates total amount correctly', async () => {
      const request: CreatePackageRequest = {
        customer_id: 'test-customer-id',
        items: [
          {
            provider_id: 'provider-1',
            service_name: 'Service 1',
            service_category: 'guide',
            price: 250,
          },
          {
            provider_id: 'provider-2',
            service_name: 'Service 2',
            service_category: 'shuttle',
            price: 150,
          },
          {
            provider_id: 'provider-3',
            service_name: 'Service 3',
            service_category: 'equipment',
            price: 100,
          },
        ],
      };

      const result = await createPackage(request);

      expect(result.total_amount).toBe(500);
    });
  });

  describe('areAllConfirmed', () => {
    it('returns false when not all providers confirmed', async () => {
      const packageId = 'test-package-id-pending';
      const result = await areAllConfirmed(packageId);
      expect(result).toBe(false);
    });

    it('returns true when all providers confirmed', async () => {
      const packageId = 'test-package-id-confirmed';
      const result = await areAllConfirmed(packageId);
      expect(result).toBe(true);
    });
  });
});
