import Link from 'next/link';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { graphics } from '@/lib/showcase/graphics';

export type PartnerMetric = {
  value: string;
  label: string;
};

export type PartnerFeature = {
  icon: AppIconName;
  title: string;
  text: string;
};

export type PartnerFlowStep = {
  title: string;
  text: string;
};

export type PartnerPresentationContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
  heroDesktop: string;
  heroMobile: string;
  heroObjectPosition?: string;
  visual: string;
  metrics: PartnerMetric[];
  featuresTitle: string;
  features: PartnerFeature[];
  flowTitle: string;
  flow: PartnerFlowStep[];
  closingTitle: string;
  closingText: string;
};

type PartnerPresentationPageProps = {
  locale: string;
  content: PartnerPresentationContent;
};

export function PartnerPresentationPage({ locale, content }: PartnerPresentationPageProps) {
  const isRTL = locale === 'he';

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#eaf4fa] pb-20 text-[#08233f]">
      <section className="relative isolate min-h-[100dvh] overflow-hidden bg-[#052b5d] text-white">
        <picture>
          <source media="(max-width: 767px)" srcSet={content.heroMobile} />
          <img
            src={content.heroDesktop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: content.heroObjectPosition || 'center' }}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-[#00162f]/68 via-[#063d70]/28 to-[#001b35]/88 md:bg-gradient-to-l md:from-[#00162f]/82 md:via-[#083967]/34 md:to-[#00162f]/24" />
        <img src={graphics.waterline} alt="" className="pointer-events-none absolute inset-x-0 bottom-[18%] hidden w-full opacity-70 md:block" />

        <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4">
            <Link href={`/${locale}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/12 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
              <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-5 w-5" />
              {isRTL ? 'חזרה לבית' : 'Back home'}
            </Link>
            <img src={graphics.logoWhite} alt="DiveDrop" className="h-12 w-auto sm:h-16" />
          </div>

          <div className="grid items-end gap-8 pb-8 pt-12 lg:grid-cols-[minmax(0,1fr)_460px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-cyan-200/18 px-4 py-2 text-sm font-black text-cyan-100 ring-1 ring-white/20 backdrop-blur">
                {content.eyebrow}
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                {content.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-cyan-50 sm:text-2xl sm:leading-10">
                {content.subtitle}
              </p>
              <div className="mt-8 grid gap-3 sm:flex">
                <Link href={content.primaryHref} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-black text-[#062b5b] shadow-[0_18px_45px_rgba(0,0,0,.22)] transition hover:-translate-y-0.5">
                  <AppIcon name="calendar" className="h-5 w-5" />
                  {content.primaryCta}
                </Link>
                <Link href={content.secondaryHref} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/12 px-6 font-black text-white backdrop-blur transition hover:bg-white/20">
                  <AppIcon name="compass" className="h-5 w-5" />
                  {content.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/20 bg-white/92 p-4 text-[#08233f] shadow-[0_24px_80px_rgba(0,22,47,.28)] backdrop-blur">
              <img src={content.visual} alt="" className="h-auto w-full rounded-[24px] object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-10 grid max-w-6xl gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {content.metrics.map((metric) => (
          <article key={metric.label} className="rounded-[26px] bg-white p-5 shadow-[0_18px_42px_rgba(8,50,94,.12)]">
            <div className="text-3xl font-black text-[#008cc8]">{metric.value}</div>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{metric.label}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="rounded-[34px] bg-white p-5 shadow-[0_18px_50px_rgba(8,50,94,.10)] sm:p-8">
          <h2 className="text-3xl font-black sm:text-4xl">{content.featuresTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {content.features.map((feature) => (
              <article key={feature.title} className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-white to-[#edf8ff] p-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#062b5b] text-white shadow-lg">
                  <AppIcon name={feature.icon} className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-xl font-black">{feature.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="overflow-hidden rounded-[34px] bg-[#062b5b] text-white shadow-[0_18px_50px_rgba(8,50,94,.18)]">
          <div className="relative min-h-[360px]">
            <img src={graphics.interfaceKit} alt="" className="absolute inset-0 h-full w-full object-cover opacity-85" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#062b5b] via-[#062b5b]/35 to-transparent" />
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-black">{content.closingTitle}</h2>
            <p className="mt-3 leading-8 text-cyan-50">{content.closingText}</p>
          </div>
        </div>

        <div className="rounded-[34px] bg-white p-5 shadow-[0_18px_50px_rgba(8,50,94,.10)] sm:p-8">
          <h2 className="text-3xl font-black">{content.flowTitle}</h2>
          <div className="mt-6 space-y-4">
            {content.flow.map((step, index) => (
              <article key={step.title} className="grid grid-cols-[54px_1fr] gap-4 rounded-[24px] bg-[#eef8ff] p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#008cc8] text-lg font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-black">{step.title}</h3>
                  <p className="mt-1 leading-7 text-slate-600">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
