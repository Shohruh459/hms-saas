'use client';

import { Calendar } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * `value` ("yyyy-MM-dd") ni joriy tilga mos ko'rinishga o'giradi.
 * `Intl`/`toLocaleDateString` ga tayanilmaydi — Chromium'da "uz" locale
 * uchun standart qisqa format aynan ISO ("yyyy-MM-dd") bilan bir xil
 * chiqadi, bu esa "mm/dd/yyyy"ni zamonaviylashtirish maqsadini buzadi.
 * Shu sabab uz/ru uchun aniq "dd.MM.yyyy", en uchun "MM/dd/yyyy" qo'lda
 * qurib beriladi.
 */
export function formatLocalizedDate(value: string, locale: string): string {
  const [year, month, day] = value.split('-');
  if (locale === 'en') {
    return `${month}/${day}/${year}`;
  }
  return `${day}.${month}.${year}`;
}

/** Yil ko'rsatilmagan qisqa variant — ixcham qidiruv panelining bir qatorli xulosasi uchun. */
export function formatShortLocalizedDate(value: string, locale: string): string {
  const [, month, day] = value.split('-');
  return locale === 'en' ? `${month}/${day}` : `${day}.${month}`;
}

/**
 * Native `<input type="date">` standart "mm/dd/yyyy" ko'rinishini
 * yashiradi va o'rniga tanlangan sanani joriy lokalizatsiya (uz/ru/en)
 * formatida ko'rsatadi — pikerning o'zi (native calendar UI) saqlanib
 * qoladi, faqat vizual ko'rinishi almashtiriladi.
 */
export function DateField({
  id,
  value,
  onChange,
  placeholder,
  locale,
  min,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  locale: string;
  min?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = value ? formatLocalizedDate(value, locale) : '';

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex h-11 items-center justify-between rounded-xl border border-input bg-background px-3 text-sm sm:h-10 sm:rounded-md',
          displayValue ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <input
        ref={inputRef}
        type="date"
        id={id}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={() => {
          const picker = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
          try {
            picker?.showPicker?.();
          } catch {
            // showPicker qo'llab-quvvatlanmasa (masalan Safari) — odatiy focus/klik yetarli.
          }
        }}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        aria-label={placeholder}
      />
    </div>
  );
}
