import { getLocale } from 'next-intl/server';
import { PartnerPresentationPage } from '@/components/PartnerPresentationPage';
import { getFreeDivingPartnerContent } from '@/lib/showcase/partner-content';

export default async function FreeDivingPartnersPage() {
  const locale = await getLocale();
  return <PartnerPresentationPage locale={locale} content={getFreeDivingPartnerContent(locale)} />;
}
