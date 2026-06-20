'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { loginAction } from '@/lib/auth/actions';
import { loginSchema, type LoginInput } from '@/lib/auth/schemas';
import { ZodError } from 'zod';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';
  const requestedDestination = searchParams.get('next');
  const destination = requestedDestination?.startsWith(`/${locale}/`)
    ? requestedDestination
    : `/${locale}/dashboard`;

  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof LoginInput]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError('');
    setErrors({});
    setLoading(true);

    try {
      loginSchema.parse(formData);
      const result = await loginAction(formData);

      if (result.error) {
        setGlobalError(result.error);
      } else if (result.success) {
        router.push(destination);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof LoginInput] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setGlobalError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <h1 className="text-2xl font-bold text-center text-primary">{t('login_title')}</h1>
        <p className="text-center text-text-secondary mt-2 text-sm">{t('login_subtitle')}</p>
      </CardHeader>

      <CardBody className="space-y-4">
        {registered && (
          <div className="p-3 bg-green-50 border border-success rounded-md text-success text-sm">
            {t('registration_success')}
          </div>
        )}

        {globalError && (
          <div className="p-3 bg-red-50 border border-error rounded-md text-error text-sm">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('email')}
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            fullWidth
            disabled={loading}
          />

          <Input
            label={t('password')}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            fullWidth
            disabled={loading}
          />

          <Button type="submit" fullWidth size="lg" loading={loading}>
            {t('login_button')}
          </Button>
        </form>

        <div className="space-y-2 text-sm">
          <div className="text-center">
            <Link href={`/${locale}/auth/forgot-password`} className="text-primary hover:underline">
              {t('forgot_password')}
            </Link>
          </div>
          <div className="text-center">
            <span className="text-text-secondary">{t('no_account')} </span>
            <Link href={`/${locale}/auth/register${requestedDestination ? `?next=${encodeURIComponent(destination)}` : ''}`} className="text-primary font-semibold hover:underline">
              {t('register_link')}
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
