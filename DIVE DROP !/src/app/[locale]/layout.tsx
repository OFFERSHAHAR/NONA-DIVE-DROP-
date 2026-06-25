import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { AppNavigation } from '@/components/AppNavigation';
import { Header } from '@/components/Header';
import '../globals.css';
import '../../styles/design-system.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await params in Next.js 16+
  const { locale } = await params;

  // Ensure locale is valid
  if (!routing.locales.includes(locale as 'en' | 'he')) {
    notFound();
  }

  const isRtl = locale === 'he';

  return (
    <html lang={locale as 'en' | 'he'} dir={isRtl ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <title>DiveDrop - Safe, Responsible, Professional Diving</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={isRtl ? 'DiveDrop - הדרך החכמה שלך לצלילה בטוחה, אחראית ומקצועית.' : 'DiveDrop - Your smart way to safe, responsible, and professional diving.'} />
      </head>
      <body className="bg-light-bg dark:bg-dark-bg text-text-primary dark:text-text-light">
        <NextIntlClientProvider locale={locale}>
          <Header />
          <main className="min-h-screen pb-32 md:pb-28">{children}</main>
          <AppNavigation />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
