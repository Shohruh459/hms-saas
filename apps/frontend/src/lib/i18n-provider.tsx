'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Dictionary } from './get-dictionary';
import type { Locale } from './i18n';

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolve(source: unknown, path: string): string | undefined {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, source) as string | undefined;
}

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dict,
      t: (key: string) => resolve(dict, key) ?? key,
    }),
    [locale, dict],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslations() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslations() I18nProvider ichida chaqirilishi kerak');
  }
  return ctx;
}
