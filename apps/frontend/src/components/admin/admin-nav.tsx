'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { useTranslations } from '../../lib/i18n-provider';
import { LanguageSwitcher } from '../language-switcher';
import { Button } from '../ui/button';

export function AdminNav() {
  const { t, locale } = useTranslations();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isHousekeeper = user?.role === 'HOUSEKEEPER';

  const links = [
    !isHousekeeper && { href: `/${locale}/admin/dashboard`, label: t('admin.dashboard') },
    !isHousekeeper && { href: `/${locale}/admin/service-requests`, label: t('admin.serviceRequests') },
    { href: `/${locale}/admin/tasks`, label: t('admin.tasks') },
    !isHousekeeper && { href: `/${locale}/admin/support-tickets`, label: t('admin.supportTickets') },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 flex-wrap items-center justify-between gap-4">
        <span className="text-lg font-bold text-primary">HMS Admin</span>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant={pathname === link.href ? 'default' : 'ghost'} size="sm">
                {link.label}
              </Button>
            </Link>
          ))}
          <LanguageSwitcher />
          <Button variant="outline" size="sm" onClick={logout}>
            {t('nav.logout')}
          </Button>
        </nav>
      </div>
    </header>
  );
}
