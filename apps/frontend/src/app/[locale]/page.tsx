import { locales } from '@/lib/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function GuestHomePage({
  params,
}: {
  params: { locale: string };
}) {
  return (
    <main>
      <h1>HMS — mehmon.uz</h1>
      <p>Til: {params.locale}</p>
      <p>Bu yerda mehmonlar xona xizmatchisini chaqirishi va yordam so&apos;rovi yuborishi mumkin.</p>
    </main>
  );
}
