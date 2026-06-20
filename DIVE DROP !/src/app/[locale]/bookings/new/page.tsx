import { useTranslations } from 'next-intl';
import { BookingWizard } from '@/components/bookings/BookingWizard';

export const metadata = {
  title: 'Create New Booking - DiveDrop',
  description: 'Book a dive with a buddy or service provider',
};

export default function NewBookingPage() {
  const t = useTranslations('bookings');

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary dark:text-text-light mb-2">
            {t('createNewBooking')}
          </h1>
          <p className="text-lg text-text-secondary dark:text-text-secondary-light">
            {t('bookingDescription')}
          </p>
        </div>

        <BookingWizard />
      </div>
    </div>
  );
}
