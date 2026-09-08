'use client';

import { useEffect } from 'react';

/** PWA "Add to Home Screen" imkoniyati uchun service worker'ni ro'yxatdan o'tkazadi. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker mavjud bo'lmasa ham ilova oddiy veb sifatida ishlayveradi.
    });
  }, []);

  return null;
}
