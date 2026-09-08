'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AdminNav } from '../../../components/admin/admin-nav';
import { useRealtimeAdminNotifications } from '../../../hooks/use-realtime-admin-notifications';
import { useAuth } from '../../../lib/auth-context';
import { useTranslations } from '../../../lib/i18n-provider';

const STAFF_ROLES = ['SUPER_ADMIN', 'HOTEL_OWNER', 'RECEPTIONIST', 'HOUSEKEEPER'];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { locale } = useTranslations();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname?.endsWith('/admin/login') ?? false;
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  useRealtimeAdminNotifications(!isLoginPage && isStaff);

  useEffect(() => {
    if (isLoginPage || loading) return;
    if (!isStaff) {
      router.push(`/${locale}/admin/login`);
    }
  }, [isLoginPage, loading, isStaff, locale, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !isStaff) {
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <AdminNav />
      <main className="container py-6">{children}</main>
    </div>
  );
}
