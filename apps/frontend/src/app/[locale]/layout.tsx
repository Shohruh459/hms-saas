import type { ReactNode } from 'react';
import { Providers } from '../../components/providers';
import { getDictionary } from '../../lib/get-dictionary';
import { locales, type Locale } from '../../lib/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({ children, params }: { children: ReactNode; params: { locale: Locale } }) {
  const dict = getDictionary(params.locale);
  return (
    <Providers locale={params.locale} dict={dict}>
      {children}
    </Providers>
  );
}
