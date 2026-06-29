import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { getPublishedContentItemsByKind, type ContentItem } from '@/lib/content/public-content';
import { graphics } from '@/lib/showcase/graphics';

const disciplines = [
  {
    code: 'CWT',
    title: { he: 'משקל קבוע', en: 'Constant Weight' },
    desc: { he: 'אימון עומק עם סנפירים לאורך חבל, עם דגש על קצב, איזון ובטיחות.', en: 'Depth training with fins along a line, focused on pace, equalization and safety.' },
  },
  {
    code: 'FIM',
    title: { he: 'צלילה בחבל', en: 'Free Immersion' },
    desc: { he: 'משיכה ידנית על החבל ללא סנפירים, מצוין לתרגול טכניקה ואיזון לחצים.', en: 'Hand-over-hand rope work without fins, ideal for technique and equalization practice.' },
  },
  {
    code: 'STA',
    title: { he: 'אפניאה סטטית', en: 'Static Apnea' },
    desc: { he: 'עצירת נשימה במנוחה על פני המים, עם תרגול רוגע, בקרה ובן זוג.', en: 'Resting breath-hold on the surface, with calm control and buddy procedure.' },
  },
  {
    code: 'DYN',
    title: { he: 'אפניאה דינמית', en: 'Dynamic Apnea' },
    desc: { he: 'שחייה אופקית על נשימה אחת בבריכה או בים פתוח, לפי רמת ניסיון.', en: 'Horizontal distance on one breath, in pool or open water by experience level.' },
  },
];

const defaultServices = [
  { title: { he: 'אימון היכרות', en: 'Intro session' }, desc: { he: 'כניסה רגועה לעולם הצלילה החופשית עם מדריך מוסמך.', en: 'A calm entry into free diving with a certified instructor.' }, icon: 'breath-badge', visual: graphics.scubaDiver },
  { title: { he: 'אימון עומק', en: 'Depth training' }, desc: { he: 'חבל, מצוף, תרגול ירידה ועלייה, ותכנון עומק מדורג.', en: 'Line, buoy, descent and ascent practice, and gradual depth planning.' }, icon: 'private-training', visual: graphics.waterline },
  { title: { he: 'קבוצת קהילה', en: 'Community group' }, desc: { he: 'מפגש קבוצתי עם בן זוג, תרגול בטיחות ותיאום ציוד.', en: 'A group session with buddy work, safety practice and gear coordination.' }, icon: 'group-training', visual: graphics.diversOnBoat },
  { title: { he: 'ציוד חופשי', en: 'Free-diving gear' }, desc: { he: 'סנפירים ארוכים, מסכה, חליפה ומשקולות כחלק מההזמנה.', en: 'Long fins, mask, suit and weights as part of the booking.' }, icon: 'equipment-rental', visual: graphics.submarine },
];

const safetyCards: Array<{ icon: AppIconName; title: { he: string; en: string }; text: { he: string; en: string } }> = [
  {
    icon: 'award',
    title: { he: 'מדריך מוסמך', en: 'Certified guide' },
    text: { he: 'כל פעילות מוצגת עם מדריך, רמת התאמה ותנאי בטיחות.', en: 'Every activity shows guide, match level and safety conditions.' },
  },
  {
    icon: 'users',
    title: { he: 'עבודה בזוגות', en: 'Buddy protocol' },
    text: { he: 'המסך מזכיר בן זוג, תדריך נשימה וזמן מנוחה בין ניסיונות.', en: 'The screen reinforces buddy work, breathing briefing and rest time.' },
  },
  {
    icon: 'waves',
    title: { he: 'תנאי ים', en: 'Sea conditions' },
    text: { he: 'תכנון הפעילות לפי אתר, עומק, מזג אוויר ונראות במים.', en: 'Activity planning by site, depth, weather and water visibility.' },
  },
];

function metadataRecord(item: ContentItem) {
  return item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : {};
}

export default async function FreeDivingPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const uploadedServices = await getPublishedContentItemsByKind('free_diving');
  const visibleServices = uploadedServices.length > 0
    ? uploadedServices.map((item) => {
        const metadata = metadataRecord(item);
        return {
          title: { he: item.title_he, en: item.title_en || item.title_he },
          icon: typeof metadata.icon === 'string' ? metadata.icon : 'breath-badge',
          image: item.image_url,
          visual: item.image_url || graphics.scubaDiver,
          desc: { he: item.summary_he, en: item.summary_en || item.summary_he },
        };
      })
    : defaultServices;

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#eaf4fa] pb-28 text-[#08233f]">
      <section className="relative isolate min-h-[92dvh] overflow-hidden bg-[#052b5d] text-white shadow-[0_18px_50px_rgba(8,42,90,.22)]">
        <picture>
          <source media="(max-width: 767px)" srcSet={graphics.heroPremiumMobile} />
          <img src={graphics.heroPremium} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-[#00162f]/55 via-[#063d70]/28 to-[#001b35]/88 md:bg-gradient-to-l md:from-[#00162f]/82 md:via-[#063d70]/30 md:to-[#00162f]/18" />
        <img src={graphics.waterline} alt="" className="pointer-events-none absolute inset-x-0 bottom-[27%] hidden w-full opacity-75 md:block" />
        <img src={graphics.scubaDiver} alt="" className="pointer-events-none absolute bottom-16 left-4 hidden w-[24rem] opacity-95 drop-shadow-2xl lg:block" />

        <div className="relative mx-auto flex min-h-[92dvh] max-w-6xl flex-col px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href={`/${locale}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/12 px-4 text-sm font-black text-white backdrop-blur hover:bg-white/20">
              <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-5 w-5" />
              {isRTL ? 'חזרה לבית' : 'Back home'}
            </Link>
            <img src={graphics.logoWhite} alt="DiveDrop" className="h-12 w-auto sm:h-16" />
          </div>

          <div className="mt-auto max-w-3xl pb-12 pt-16">
            <span className="inline-flex rounded-full bg-cyan-200/18 px-4 py-2 text-sm font-black text-cyan-100 ring-1 ring-white/20 backdrop-blur">
              {isRTL ? 'מודול צלילה חופשית מלא' : 'Complete free-diving module'}
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              {isRTL ? 'צלילה חופשית באילת, עם תהליך הזמנה ברור' : 'Free diving in Eilat with a clear booking flow'}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-cyan-50 sm:text-2xl sm:leading-10">
              {isRTL ? 'אימונים, דיסציפלינות, ציוד, מדריך ובן זוג נכנסים למסלול אחד שנראה כמו מוצר חי.' : 'Training, disciplines, gear, guide and buddy work enter one product-ready flow.'}
            </p>
            <div className="mt-8 grid gap-3 sm:flex">
              <Link href={`/${locale}/bookings?module=free-diving`} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-black text-[#062b5b] shadow-[0_18px_45px_rgba(0,0,0,.22)]">
                <AppIcon name="calendar" className="h-5 w-5" />
                {isRTL ? 'בקשת אימון צלילה חופשית' : 'Request free-diving session'}
              </Link>
              <Link href={`/${locale}/partners/free-diving`} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/12 px-6 font-black text-white backdrop-blur">
                <AppIcon name="compass" className="h-5 w-5" />
                {isRTL ? 'עמוד הצגה לשותפים' : 'Partner presentation'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-10 grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {disciplines.map((item) => (
          <article key={item.code} className="rounded-[28px] bg-white p-5 shadow-[0_18px_42px_rgba(8,50,94,.12)]">
            <div className="mb-4 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#062b5b] p-3 shadow-lg">
                <span className="text-lg font-black text-cyan-100">{item.code}</span>
              </span>
              <div>
                <div className="text-xs font-black text-[#008cc8]">{item.code}</div>
                <h2 className="text-xl font-black">{isRTL ? item.title.he : item.title.en}</h2>
              </div>
            </div>
            <p className="leading-7 text-slate-600">{isRTL ? item.desc.he : item.desc.en}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[34px] bg-white p-5 shadow-[0_18px_50px_rgba(8,50,94,.10)] sm:p-8">
          <h2 className="text-3xl font-black sm:text-4xl">{isRTL ? 'מסלולי פעילות מוכנים להצגה' : 'Activity tracks ready for demo'}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visibleServices.map((item) => {
              const imageSrc = 'image' in item && typeof item.image === 'string' && item.image
                ? item.image
                : item.visual;
              return (
                <article key={`${item.icon}-${item.title.he}`} className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-white to-[#edf8ff] p-5">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 p-3 shadow-lg">
                    <img src={imageSrc} alt="" className="h-full w-full object-contain drop-shadow-md" />
                  </span>
                  <h3 className="mt-4 text-xl font-black">{isRTL ? item.title.he : item.title.en}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{isRTL ? item.desc.he : item.desc.en}</p>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="overflow-hidden rounded-[34px] bg-[#062b5b] text-white shadow-[0_18px_50px_rgba(8,50,94,.18)]">
          <div className="relative min-h-[360px]">
            <img src={graphics.interfaceKit} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#062b5b] via-[#062b5b]/24 to-transparent" />
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-black">{isRTL ? 'איך זה מתחבר לממשק' : 'How it connects to the interface'}</h2>
            <p className="mt-3 leading-8 text-cyan-50">
              {isRTL ? 'הלקוח בוחר מסלול, מוסיף ציוד, משאיר פרטים, והבקשה נשמרת כליד אמיתי להמשך טיפול.' : 'The customer chooses a track, adds gear, leaves details, and the request is stored as a real lead.'}
            </p>
          </div>
        </aside>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="rounded-[34px] bg-white p-5 shadow-[0_18px_50px_rgba(8,50,94,.10)] sm:p-8">
          <h2 className="text-3xl font-black sm:text-4xl">{isRTL ? 'בטיחות לפני כפתור הזמנה' : 'Safety before the booking button'}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {safetyCards.map((card) => (
              <article key={card.title.he} className="rounded-[26px] bg-[#eef8ff] p-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008cc8] text-white">
                  <AppIcon name={card.icon} className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-xl font-black">{isRTL ? card.title.he : card.title.en}</h3>
                <p className="mt-2 leading-7 text-slate-600">{isRTL ? card.text.he : card.text.en}</p>
              </article>
            ))}
          </div>
          <Link href={`/${locale}/bookings?module=free-diving`} className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-700 to-cyan-500 px-5 font-black text-white shadow-lg">
            <AppIcon name="calendar" className="h-5 w-5" />
            {isRTL ? 'פתח ליד לצלילה חופשית' : 'Open a free-diving lead'}
          </Link>
        </div>
      </section>
    </main>
  );
}
