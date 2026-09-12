'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from '../lib/i18n-provider';

/**
 * Mobil ekranlarda (md dan kichik) to'liq nav qatorini almashtiradigan
 * burger-menu — o'ng tomondan suziladigan panel. `children` sifatida
 * xuddi shu nav elementlari (login/register, xizmat so'rovlari va h.k.)
 * beriladi, ular ichki bosilganda panel avtomatik yopiladi.
 */
export function MobileNavSheet({ children }: { children: ReactNode }) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={t('nav.menu')}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-input transition-colors hover:bg-secondary md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="mobile-nav-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="mobile-nav-panel"
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.menu')}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 right-0 z-[60] flex w-72 max-w-[85vw] flex-col gap-5 bg-background p-5 shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">{t('nav.menu')}</span>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  onClick={() => setOpen(false)}
                  className="rounded-sm p-1.5 transition-colors hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col items-stretch gap-2" onClick={() => setOpen(false)}>
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
