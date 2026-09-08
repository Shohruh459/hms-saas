import type { ReactNode } from 'react';

export const metadata = {
  title: 'HMS — Hotel Management System',
  description: 'Mehmonxonalar uchun multi-tenant SaaS platforma',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
