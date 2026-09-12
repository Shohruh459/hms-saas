'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { useTranslations } from '../lib/i18n-provider';
import { LanguageSwitcher } from './language-switcher';
import { MobileNavSheet } from './mobile-nav-sheet';
import { RoomServiceModal } from './room-service-modal';
import { SupportTicketModal } from './support-ticket-modal';
import { Button } from './ui/button';

export function SiteHeader() {
  const { t, locale } = useTranslations();
  const { user, logout } = useAuth();

  const navActions = (
    <>
      {user?.role === 'GUEST' && (
        <>
          <RoomServiceModal />
          <SupportTicketModal />
          <Link href={`/${locale}/bookings`} className="w-full md:w-auto">
            <Button variant="ghost" size="sm" className="w-full md:w-auto">
              {t('nav.myBookings')}
            </Button>
          </Link>
        </>
      )}

      {user ? (
        <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={logout}>
          {t('nav.logout')}
        </Button>
      ) : (
        <>
          <Link href={`/${locale}/login`} className="w-full md:w-auto">
            <Button variant="outline" size="sm" className="w-full md:w-auto">
              {t('nav.login')}
            </Button>
          </Link>
          <Link href={`/${locale}/register`} className="w-full md:w-auto">
            <Button size="sm" className="w-full md:w-auto">
              {t('nav.register')}
            </Button>
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex min-h-14 items-center justify-between gap-2 py-2.5 sm:min-h-16 sm:gap-3 sm:py-3">
        <Link href={`/${locale}`} className="shrink-0 px-1 text-base font-bold text-primary sm:px-0 sm:text-lg">
          HMS
        </Link>

        <nav className="hidden flex-wrap items-center gap-2 md:flex">{navActions}</nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <LanguageSwitcher />
          <MobileNavSheet>{navActions}</MobileNavSheet>
        </div>
      </div>
    </header>
  );
}
