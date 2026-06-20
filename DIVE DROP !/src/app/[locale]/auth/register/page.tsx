'use client';

export const dynamic = 'force-dynamic';

import { UnderwaterBackground } from '@/components/auth/UnderwaterBackground';
import { DiveDropRegisterForm } from '@/components/auth/DiveDropRegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-dark-ocean relative overflow-hidden">
      <UnderwaterBackground />
      <DiveDropRegisterForm />
    </div>
  );
}
