import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { AppIcon } from '@/components/AppIcon';

const disciplines = [
  {
    code: 'CWT',
    title: { he: 'משקל קבוע', en: 'Constant Weight' },
    icon: 'cwt-constant-weight',
    desc: { he: 'ירידה ועלייה לאורך החבל בעזרת סנפיר, ללא שינוי משקל.', en: 'Descend and ascend along the line with fins and no weight change.' },
  },
  {
    code: 'FIM',
    title: { he: 'צלילה בחבל', en: 'Free Immersion' },
    icon: 'fim-free-immersion',
    desc: { he: 'משיכה ידנית על החבל ללא סנפירים, מצוין לאיזון לחצים.', en: 'Hand-over-hand line work without fins, ideal for equalization practice.' },
  },
  {
    code: 'STA',
    title: { he: 'אפניאה סטטית', en: 'Static Apnea' },
    icon: 'sta-static-apnea',
    desc: { he: 'עצירת נשימה במנוחה על פני המים, מדד של זמן ורוגע.', en: 'Breath-hold at rest on the surface, focused on calm and time.' },
  },
  {
    code: 'DYN',
    title: { he: 'אפניאה דינמית', en: 'Dynamic Apnea' },
    icon: 'dyn-dynamic-apnea',
    desc: { he: 'שחייה אופקית למרחק על נשימה אחת, בבריכה או בים פתוח.', en: 'Horizontal distance swimming on one breath, in pool or open water.' },
  },
];

const services = [
  { title: { he: 'אימונים פרטיים', en: 'Private training' }, icon: 'private-training' },
  { title: { he: 'אימונים בקבוצות', en: 'Group training' }, icon: 'group-training' },
  { title: { he: 'ימי אימון לבתי ספר', en: 'School training days' }, icon: 'school-days' },
  { title: { he: 'פעילויות כלליות', en: 'Open activities' }, icon: 'general-activities' },
];

export default async function FreeDivingPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#eef5fb] pb-28 text-[#08234a]">
      <section className="relative overflow-hidden rounded-b-[34px] bg-[#042a5a] px-5 pb-10 pt-6 text-white shadow-[0_18px_50px_rgba(8,42,90,.22)]">
        <img src="/divedrop-hero-v2.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#00162f]/40 via-[#052c61]/60 to-[#001d42]" />
        <div className="relative mx-auto max-w-5xl">
          <Link href={`/${locale}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/12 px-4 text-sm font-bold backdrop-blur hover:bg-white/20">
            <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-5 w-5" />
            {isRTL ? 'חזרה לבית' : 'Back home'}
          </Link>
          <div className="mt-10 max-w-2xl">
            <span className="inline-flex rounded-full bg-cyan-400/20 px-4 py-2 text-sm font-extrabold text-cyan-200">{isRTL ? 'מודול חדש' : 'New module'}</span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">{isRTL ? 'צלילה חופשית' : 'Free Diving'}</h1>
            <p className="mt-4 text-lg leading-8 text-cyan-50 sm:text-2xl sm:leading-10">
              {isRTL ? 'אימונים, פעילויות וקהילה לצלילה חופשית בטוחה ומדויקת.' : 'Training, activities and community for safe, precise free diving.'}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)] sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">{isRTL ? 'דיסציפלינות' : 'Disciplines'}</h2>
              <p className="mt-1 text-slate-600">{isRTL ? 'המסלולים המרכזיים של צלילה חופשית.' : 'Core tracks for free-diving practice.'}</p>
            </div>
            <AppIcon name="waves" className="h-10 w-10 text-cyan-500" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {disciplines.map((item) => (
              <article key={item.code} className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5">
                <div className="mb-4 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 p-3 shadow-lg">
                    <img src={`/assets/freediving/icons/disciplines/${item.icon}.svg`} alt="" className="h-full w-full invert" />
                  </span>
                  <div>
                    <div className="text-xs font-black text-cyan-600">{item.code}</div>
                    <h3 className="text-xl font-black">{isRTL ? item.title.he : item.title.en}</h3>
                  </div>
                </div>
                <p className="leading-7 text-slate-600">{isRTL ? item.desc.he : item.desc.en}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-[#062b5b] p-5 text-white shadow-[0_12px_35px_rgba(15,63,110,.18)] sm:p-7">
          <h2 className="text-2xl font-black">{isRTL ? 'שירותים זמינים ב-MVP' : 'MVP services'}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {services.map((item) => (
              <div key={item.icon} className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
                <img src={`/assets/freediving/icons/services/${item.icon}.svg`} alt="" className="mx-auto mb-3 h-10 w-10 invert" />
                <div className="font-extrabold">{isRTL ? item.title.he : item.title.en}</div>
              </div>
            ))}
          </div>
          <Link href={`/${locale}/auth/login?next=/${locale}/free-diving`} className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-cyan-400 px-5 font-black text-white shadow-lg">
            <AppIcon name="calendar" className="h-5 w-5" />
            {isRTL ? 'הצטרפות לאימון' : 'Join a session'}
          </Link>
        </section>
      </div>
    </main>
  );
}
