import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { AppIcon } from '@/components/AppIcon';
import { getPublishedContentItemsByKind, type ContentItem } from '@/lib/content/public-content';

const equipment = [
  {
    title: { he: 'מסכות ושנורקלים', en: 'Masks and snorkels' },
    desc: { he: 'ציוד נקי ומוכן למים לכל פעילות.', en: 'Clean, water-ready gear for every activity.' },
    icon: 'equipment-rental',
  },
  {
    title: { he: 'סנפירים לצלילה חופשית', en: 'Free-diving fins' },
    desc: { he: 'סנפירים ארוכים לאימונים ולים פתוח.', en: 'Long fins for training and open water.' },
    icon: 'breath-badge',
  },
  {
    title: { he: 'חליפות ומשקולות', en: 'Suits and weights' },
    desc: { he: 'התאמה מהירה לפי מידה ורמת ניסיון.', en: 'Fast matching by size and experience.' },
    icon: 'private-training',
  },
  {
    title: { he: 'חבילות קבוצתיות', en: 'Group bundles' },
    desc: { he: 'פתרון לצוותים, בתי ספר וקבוצות.', en: 'A package for teams, schools and groups.' },
    icon: 'group-training',
  },
];

function metadataRecord(item: ContentItem) {
  return item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : {};
}

export default async function EquipmentPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const uploadedEquipment = await getPublishedContentItemsByKind('equipment');
  const visibleEquipment = uploadedEquipment.length > 0
    ? uploadedEquipment.map((item) => {
        const metadata = metadataRecord(item);
        return {
          title: { he: item.title_he, en: item.title_en || item.title_he },
          desc: { he: item.summary_he, en: item.summary_en || item.summary_he },
          icon: typeof metadata.icon === 'string' ? metadata.icon : 'equipment-rental',
          image: item.image_url,
        };
      })
    : equipment;

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#eef5fb] pb-28 text-[#08234a]">
      <section className="relative overflow-hidden rounded-b-[34px] bg-[#05295a] px-5 pb-10 pt-6 text-white shadow-[0_18px_50px_rgba(8,42,90,.22)]">
        <img src="/divedrop-hero-v2.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#00162f]/30 via-[#052c61]/70 to-[#001d42]" />
        <div className="relative mx-auto max-w-5xl">
          <Link href={`/${locale}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/12 px-4 text-sm font-bold backdrop-blur hover:bg-white/20">
            <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-5 w-5" />
            {isRTL ? 'חזרה לבית' : 'Back home'}
          </Link>
          <div className="mt-10 max-w-2xl">
            <span className="inline-flex rounded-full bg-orange-400/20 px-4 py-2 text-sm font-extrabold text-orange-100">{isRTL ? 'השכרה מהירה' : 'Fast rental'}</span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">{isRTL ? 'השכרת ציוד' : 'Equipment Rental'}</h1>
            <p className="mt-4 text-lg leading-8 text-cyan-50 sm:text-2xl sm:leading-10">
              {isRTL ? 'מסכות, סנפירים, חליפות וחבילות לקבוצות, עם חיבור ישיר לפעילות.' : 'Masks, fins, suits and group bundles connected directly to activity planning.'}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2">
          {visibleEquipment.map((item) => {
            const imageSrc = 'image' in item && typeof item.image === 'string' && item.image
              ? item.image
              : `/assets/freediving/icons/services/${item.icon}.svg`;
            return (
              <article key={`${item.icon}-${item.title.he}`} className="rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)]">
                <div className="mb-4 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 p-3 shadow-lg">
                    <img src={imageSrc} alt="" className="h-full w-full invert" />
                  </span>
                  <h2 className="text-xl font-black">{isRTL ? item.title.he : item.title.en}</h2>
                </div>
                <p className="leading-7 text-slate-600">{isRTL ? item.desc.he : item.desc.en}</p>
              </article>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-[30px] bg-white shadow-[0_12px_35px_rgba(15,63,110,.10)]">
          <div className="grid sm:grid-cols-[1fr_1.1fr]">
            <div className="p-6 sm:p-8">
              <h2 className="text-3xl font-black">{isRTL ? 'איך זה עובד' : 'How it works'}</h2>
              <div className="mt-5 space-y-4">
                {[
                  isRTL ? 'בוחרים פעילות או אתר צלילה.' : 'Choose an activity or dive site.',
                  isRTL ? 'מסמנים ציוד נדרש לפי רמה ומידה.' : 'Select required gear by level and size.',
                  isRTL ? 'מקבלים אישור איסוף/החזרה בממשק.' : 'Get pickup and return confirmation in the app.',
                ].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 font-black text-white">{index + 1}</span>
                    <span className="font-bold">{step}</span>
                  </div>
                ))}
              </div>
              <Link href={`/${locale}/bookings?module=equipment`} className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-700 to-cyan-500 px-5 font-black text-white shadow-lg">
                <AppIcon name="calendar" className="h-5 w-5" />
                {isRTL ? 'בקשת השכרת ציוד' : 'Request equipment'}
              </Link>
            </div>
            <div className="relative min-h-[300px]">
              <img src="/divedrop-hero-v2.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001d42]/80 via-transparent to-transparent" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
