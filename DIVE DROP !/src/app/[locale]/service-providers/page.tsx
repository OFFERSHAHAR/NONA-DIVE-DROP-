import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ServiceProviderBrowse } from './client';

export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('service_providers.title'),
    description: t('service_providers.description'),
  };
}

export default async function ServiceProvidersPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';

  return (
    <main className={isRTL ? 'text-right' : 'text-left'}>
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <ServiceProviderBrowse />
      </Suspense>
    </main>
  );
}
