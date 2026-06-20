'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

export default function VerifyEmailPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleVerification = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      const error = searchParams.get('error');
      const success = searchParams.get('success');

      // Handle success redirect from GET endpoint
      if (success === 'true') {
        setStatus('success');
        setMessage(t('auth.verification.verification_success'));
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        return;
      }

      // Handle error cases
      if (error) {
        if (error === 'link_expired') {
          setStatus('expired');
          setMessage(t('auth.verification.link_expired'));
        } else if (error === 'invalid_token') {
          setStatus('error');
          setMessage(t('auth.verification.invalid_token'));
        } else if (error === 'missing_params') {
          setStatus('error');
          setMessage(t('auth.verification.verification_error'));
        } else {
          setStatus('error');
          setMessage(t('auth.verification.verification_error'));
        }
        return;
      }

      // Process verification if token and email present
      if (token && email) {
        try {
          const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, email }),
          });

          if (response.ok) {
            setStatus('success');
            setMessage(t('auth.verification.verification_success'));
            setTimeout(() => {
              router.push('/dashboard');
            }, 3000);
          } else if (response.status === 410) {
            setStatus('expired');
            setMessage(t('auth.verification.link_expired'));
          } else {
            setStatus('error');
            setMessage(t('auth.verification.invalid_token'));
          }
        } catch (error) {
          setStatus('error');
          setMessage(t('common.error'));
          console.error('Verification error:', error);
        }
      }
    };

    handleVerification();
  }, [searchParams, router, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="text-5xl mb-6">🤿</div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.verification.title')}
          </h1>

          {/* Content based on status */}
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="text-6xl">✅</div>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {message}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('home.title')} में आपको स्वागत है
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Redirecting...
              </p>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-4">
              <div className="text-6xl">⏱️</div>
              <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {message}
              </p>
              <button
                onClick={() => router.push('/auth/resend-verification')}
                className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('auth.verification.resend_button')}
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-6xl">❌</div>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {message}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('auth.login_button')}
                </button>
                <button
                  onClick={() => router.push('/auth/register')}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('auth.register_button')}
                </button>
              </div>
            </div>
          )}

          {/* Info section */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.verification.check_inbox')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {t('auth.verification.check_spam')}
            </p>
          </div>

          {/* Support */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {t('common.error')}?
            </p>
            <a
              href="mailto:support@divedrop.com"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
            >
              support@divedrop.com
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600 dark:text-gray-400">
          <p>DIVE DROP - Safe, Responsible, Professional Diving</p>
        </div>
      </div>
    </div>
  );
}
