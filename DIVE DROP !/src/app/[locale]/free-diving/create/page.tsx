export const dynamic = 'force-dynamic';

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { SessionForm } from '@/components/free-diving/SessionForm';
import { AppIcon } from '@/components/AppIcon';

export default function CreateSessionPage() {
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'he';
  const [loading, setLoading] = useState(false);

  const labels = {
    en: {
      title: 'Create a New Session',
      subtitle: 'Set up a free diving session for your students',
      success: 'Session created successfully!',
      error: 'Failed to create session',
    },
    he: {
      title: 'צור צלילה חדשה',
      subtitle: 'הכנס צלילה חדשה לתלמידיך',
      success: 'הצלילה נוצרה בהצלחה!',
      error: 'שגיאה ביצירת הצלילה',
    },
  };

  const currentLabels = labels[locale as 'en' | 'he'];

  const handleSubmit = async (data: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/free-diving-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || currentLabels.error);
        return;
      }

      const newSession = await response.json();
      alert(currentLabels.success);
      router.push(`/${locale}/free-diving/sessions/${newSession.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert(currentLabels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 py-8 shadow-lg">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-white">{currentLabels.title}</h1>
          <p className="mt-2 text-lg text-blue-100">{currentLabels.subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-8 shadow-md">
          <SessionForm onSubmit={handleSubmit} isLoading={loading} />
        </div>
      </div>
    </div>
  );
}
