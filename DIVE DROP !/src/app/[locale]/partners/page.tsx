import { getLocale } from 'next-intl/server';
import { PartnerPresentationPage } from '@/components/PartnerPresentationPage';
import { getPartnerHubContent } from '@/lib/showcase/partner-content';

export default async function PartnersPage() {
  const locale = await getLocale();
  return <PartnerPresentationPage locale={locale} content={getPartnerHubContent(locale)} />;
}
