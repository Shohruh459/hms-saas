'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useTranslations } from '../../../lib/i18n-provider';

export default function AdminIndexPage() {
  const { locale } = useTranslations();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push(`/${locale}/admin/login`);
      return;
    }
    router.push(user.role === 'HOUSEKEEPER' ? `/${locale}/admin/tasks` : `/${locale}/admin/dashboard`);
  }, [loading, user, locale, router]);

  return null;
}
