import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { RegisterServiceWorker } from '../components/register-service-worker';
import './globals.css';

export const metadata: Metadata = {
  title: 'HMS — Hotel Management System',
  description: 'Mehmonxonalar uchun multi-tenant SaaS platforma',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HMS',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
