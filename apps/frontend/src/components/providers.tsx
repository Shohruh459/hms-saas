'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth-context';
import type { Dictionary } from '../lib/get-dictionary';
import type { Locale } from '../lib/i18n';
import { I18nProvider } from '../lib/i18n-provider';
import { Toaster } from './ui/toaster';

export function Providers({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  return (
    <I18nProvider locale={locale} dict={dict}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </I18nProvider>
  );
}
