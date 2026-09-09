'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { fetchCurrentUser } from '../../../../../lib/api/auth';
import { setToken } from '../../../../../lib/api/client';
import { useTranslations } from '../../../../../lib/i18n-provider';

const STAFF_ROLES = ['SUPER_ADMIN', 'HOTEL_OWNER', 'RECEPTIONIST', 'HOUSEKEEPER'];

function GoogleCallbackInner() {
  const { locale } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.push(`/${locale}/admin/login`);
      return;
    }

    setToken(token);
    fetchCurrentUser()
      .then((user: { role: string }) => {
        // To'liq navigatsiya — AuthProvider yangi tokenni o'qib, foydalanuvchini qayta yuklaydi.
        window.location.href = STAFF_ROLES.includes(user.role) ? `/${locale}/admin/dashboard` : `/${locale}`;
      })
      .catch(() => {
        window.location.href = `/${locale}/admin/login`;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function GoogleCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense fallback={null}>
        <GoogleCallbackInner />
      </Suspense>
    </main>
  );
}
