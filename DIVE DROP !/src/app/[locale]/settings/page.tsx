'use server';

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import SettingsClient from './client';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations('settings');
  let supabase;
  let user;

  try {
    supabase = await createClient();
    const authResult = await supabase.auth.getUser();
    user = authResult.data.user;
  } catch {
    redirect(`/${locale}/auth/login?next=/${locale}/settings`);
  }

  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/settings`);
  }

  // Fetch user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const userEmail = user.email || '';
  const userData = {
    email: userEmail,
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    language: locale as 'en' | 'he',
    darkMode: false,
    notificationsEnabled: true,
    depthUnit: 'meters' as const,
    timeZone: 'UTC',
    certificationLevel: 'open_water',
    shareProfile: false,
    shareDiveStats: false,
  };

  return (
    <main className="min-h-screen bg-bg-primary pt-24 pb-12">
      <div className="container-safe max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="h2 text-text-primary mb-2">{t('title')}</h1>
          <p className="text-body text-text-secondary">{t('subtitle')}</p>
        </div>

        {/* Settings Content - Client Component for Interactivity */}
        <SettingsClient initialData={userData} locale={locale} />
      </div>
    </main>
  );
}
