'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppIcon } from '@/components/AppIcon';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const { locale } = useParams<{ locale: string }>();
  const isRTL = locale === 'he';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError(isRTL ? 'הסיסמה חייבת להכיל לפחות 8 תווים.' : 'Password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError(isRTL ? 'הסיסמאות אינן תואמות.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(isRTL ? 'קישור האיפוס אינו תקף או שפג תוקפו.' : 'The reset link is invalid or has expired.');
    } else {
      setMessage(isRTL ? 'הסיסמה עודכנה בהצלחה.' : 'Your password was updated successfully.');
    }
    setLoading(false);
  };

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-[#001d3d] to-[#005c8f] px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-cyan-200/30 bg-white p-6 text-[#10264b] shadow-2xl sm:p-8">
        <img src="/assets/logo/divedrop-logo-full.svg" alt="DiveDrop" className="mx-auto mb-6 h-16 w-auto" />
        <h1 className="text-center text-2xl font-extrabold">{isRTL ? 'בחירת סיסמה חדשה' : 'Choose a new password'}</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-bold" htmlFor="new-password">{isRTL ? 'סיסמה חדשה' : 'New password'}</label>
          <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <label className="block text-sm font-bold" htmlFor="confirm-password">{isRTL ? 'אימות סיסמה' : 'Confirm password'}</label>
          <input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-700 to-cyan-500 font-extrabold text-white shadow-lg disabled:opacity-60">
            <AppIcon name="check" className="h-5 w-5" />{loading ? (isRTL ? 'מעדכן...' : 'Updating...') : (isRTL ? 'עדכן סיסמה' : 'Update password')}
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
