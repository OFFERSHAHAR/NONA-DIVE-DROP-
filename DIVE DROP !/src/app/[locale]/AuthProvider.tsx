'use client';

import { ReactNode } from 'react';
import { useAuthInit } from '@/lib/hooks/useAuthInit';

export function AuthProvider({ children }: { children: ReactNode }) {
  useAuthInit();
  return <>{children}</>;
}
