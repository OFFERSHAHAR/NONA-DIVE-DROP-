import { getLocale } from 'next-intl/server';
import { PartnerPresentationPage } from '@/components/PartnerPresentationPage';
import { getShuttleDriverContent } from '@/lib/showcase/partner-content';

export default async function ShuttleDriverPartnersPage() {
  const locale = await getLocale();
  return <PartnerPresentationPage locale={locale} content={getShuttleDriverContent(locale)} />;
}
