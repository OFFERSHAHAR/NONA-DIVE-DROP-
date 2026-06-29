'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppIcon } from '@/components/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { graphics } from '@/lib/showcase/graphics';

export default function ForgotPasswordPage() {
  const { locale } = useParams<{ locale: string }>();
  const isRTL = locale === 'he';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/auth/update-password`,
    });

    if (resetError) {
      setError(isRTL ? 'לא ניתן לשלוח כרגע קישור איפוס. נסה שוב.' : 'Unable to send a reset link. Please try again.');
    } else {
      setMessage(isRTL ? 'קישור לאיפוס הסיסמה נשלח לכתובת שהזנת.' : 'A password reset link was sent to your email.');
    }
    setLoading(false);
  };

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-[#001d3d] to-[#005c8f] px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-cyan-200/30 bg-white p-6 text-[#10264b] shadow-2xl sm:p-8">
        <img src={graphics.logoDark} alt="DiveDrop" className="mx-auto mb-6 h-16 w-auto" />
        <h1 className="text-center text-2xl font-extrabold">{isRTL ? 'איפוס סיסמה' : 'Reset password'}</h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600">{isRTL ? 'הזן כתובת דואר אלקטרוני ונשלח אליך קישור מאובטח.' : 'Enter your email and we will send you a secure reset link.'}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-bold" htmlFor="reset-email">{isRTL ? 'דואר אלקטרוני' : 'Email address'}</label>
          <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-700 to-cyan-500 font-extrabold text-white shadow-lg disabled:opacity-60">
            <AppIcon name="message" className="h-5 w-5" />{loading ? (isRTL ? 'שולח...' : 'Sending...') : (isRTL ? 'שלח קישור איפוס' : 'Send reset link')}
          </button>
        </form>

        {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <Link href={`/${locale}/auth/login`} className="mt-6 flex items-center justify-center gap-2 font-bold text-blue-700 hover:underline">
          <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-4 w-4" />{isRTL ? 'חזרה לכניסה' : 'Back to login'}
        </Link>
      </section>
    </main>
  );
}
