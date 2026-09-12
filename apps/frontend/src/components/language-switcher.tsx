'use client';

import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '../lib/i18n';
import { useTranslations } from '../lib/i18n-provider';

const LABELS: Record<Locale, string> = { uz: "O'zbek", ru: 'Русский', en: 'English' };

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useTranslations();

  function switchLocale(next: string) {
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/') || '/');
  }

  return (
    <select
      value={locale}
      onChange={(event) => switchLocale(event.target.value)}
      className="rounded-md border border-input bg-background px-1.5 py-1 text-xs sm:px-2 sm:text-sm"
      aria-label="Til / Язык / Language"
    >
      {locales.map((code) => (
        <option key={code} value={code}>
          {LABELS[code]}
        </option>
      ))}
    </select>
  );
}
