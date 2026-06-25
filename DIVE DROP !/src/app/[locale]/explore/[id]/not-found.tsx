'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppIcon } from '@/components/AppIcon';

export default function DiveSiteNotFound() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale === 'he' ? 'he' : 'en';
  const isRTL = locale === 'he';

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] px-4 py-20 text-[#10264b]">
      <section className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center shadow-xl">
        <AppIcon name="info" className="mx-auto mb-4 h-14 w-14 text-blue-600" />
        <h1 className="text-2xl font-extrabold">{isRTL ? 'אתר הצלילה לא נמצא' : 'Dive site not found'}</h1>
        <p className="mt-3 text-slate-600">
          {isRTL ? 'ייתכן שהאתר הוסר או שהקישור אינו תקין.' : 'The site may have been removed or the link is invalid.'}
        </p>
        <Link href={`/${locale}/explore`} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-6 font-bold text-white">
          <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-5 w-5" />
          {isRTL ? 'חזרה לאתרי הצלילה' : 'Back to dive sites'}
        </Link>
      </section>
    </main>
  );
}
