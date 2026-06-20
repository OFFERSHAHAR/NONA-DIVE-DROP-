'use client';

export const dynamic = 'force-dynamic';

import { UnderwaterBackground } from '@/components/auth/UnderwaterBackground';
import { DiveDropLoginForm } from '@/components/auth/DiveDropLoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-dark-ocean relative overflow-hidden">
      <UnderwaterBackground />
      <DiveDropLoginForm />
    </div>
  );
}
