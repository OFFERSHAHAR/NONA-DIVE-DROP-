import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { ServiceProviderProfile } from './client';

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: 'Service Provider Profile',
  };
}

export default async function ServiceProviderProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const locale = await getLocale();

  return (
    <main>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            Loading provider details...
          </div>
        }
      >
        <ServiceProviderProfile providerId={params.id} locale={locale} />
      </Suspense>
    </main>
  );
}
