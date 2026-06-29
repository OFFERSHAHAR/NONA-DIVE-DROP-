import { getLocale } from 'next-intl/server';
import { PartnerPresentationPage } from '@/components/PartnerPresentationPage';
import { getInstructorContent } from '@/lib/showcase/partner-content';

export default async function InstructorPartnersPage() {
  const locale = await getLocale();
  return <PartnerPresentationPage locale={locale} content={getInstructorContent(locale)} />;
}
