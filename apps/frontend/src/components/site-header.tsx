'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { useTranslations } from '../lib/i18n-provider';
import { LanguageSwitcher } from './language-switcher';
import { RoomServiceModal } from './room-service-modal';
import { SupportTicketModal } from './support-ticket-modal';
import { Button } from './ui/button';

export function SiteHeader() {
  const { t, locale } = useTranslations();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href={`/${locale}`} className="text-lg font-bold text-primary">
          HMS
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {user?.role === 'GUEST' && (
            <>
              <RoomServiceModal />
              <SupportTicketModal />
              <Link href={`/${locale}/bookings`}>
                <Button variant="ghost" size="sm">
                  {t('nav.myBookings')}
                </Button>
              </Link>
            </>
          )}

          <LanguageSwitcher />

          {user ? (
            <Button variant="outline" size="sm" onClick={logout}>
              {t('nav.logout')}
            </Button>
          ) : (
            <>
              <Link href={`/${locale}/login`}>
                <Button variant="outline" size="sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href={`/${locale}/register`}>
                <Button size="sm">{t('nav.register')}</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
