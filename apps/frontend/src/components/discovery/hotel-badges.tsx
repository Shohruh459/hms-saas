'use client';

import { Crown, ShieldCheck, Sparkles } from 'lucide-react';
import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { cn } from '../../lib/utils';

const EXCELLENT_RATING_THRESHOLD = 4.5;

function BadgePill({ icon: Icon, label, className }: { icon: typeof Crown; label: string; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/**
 * Mehmonxona kartochkalari uchun zamonaviy nishonlar — barchasi haqiqiy
 * ma'lumotlarga asoslangan: Verified (Discovery'da faqat videoApproved
 * mehmonxonalar chiqadi), Top Choice (reyting bo'yicha #1) va Excellent
 * (reyting >= 4.5).
 */
export function HotelBadges({ hotel, rank }: { hotel: DiscoveryHotel; rank?: number }) {
  const { t } = useTranslations();
  const isTopChoice = rank === 0 && hotel.rating !== null;
  const isExcellent = !isTopChoice && hotel.rating !== null && hotel.rating >= EXCELLENT_RATING_THRESHOLD;

  return (
    <div className="flex flex-wrap gap-1.5">
      {isTopChoice && (
        <BadgePill icon={Crown} label={t('discovery.badgeTopChoice')} className="bg-amber-400/90 text-amber-950" />
      )}
      {isExcellent && (
        <BadgePill icon={Sparkles} label={t('discovery.badgeExcellent')} className="bg-violet-500/90 text-white" />
      )}
      <BadgePill icon={ShieldCheck} label={t('discovery.badgeVerified')} className="bg-emerald-500/90 text-white" />
    </div>
  );
}
