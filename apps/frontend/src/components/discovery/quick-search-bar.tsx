'use client';

import { motion } from 'framer-motion';
import { BedDouble, Calendar, MapPin, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from '../../lib/i18n-provider';

export type QuickSearchRoomType = '' | 'PRIVATE' | 'SHARED';

/**
 * Bosh sahifa hero qismidagi ixcham qidiruv paneli — hudud (backend'ga
 * ulangan, natijalarni haqiqatan filtrlaydi), sana/mehmon/xona turi
 * (foydalanuvchi niyatini yig'ish uchun, hozircha faqat UI holatida
 * saqlanadi — Discovery API hali bu maydonlar bo'yicha filtrlashni
 * qo'llab-quvvatlamaydi). "Qidirish" bosilganda natijalar bo'limiga
 * silliq scroll qilinadi.
 */
export function QuickSearchBar({
  regions,
  region,
  onRegionChange,
}: {
  regions: string[];
  region: string;
  onRegionChange: (region: string) => void;
}) {
  const { t } = useTranslations();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [roomType, setRoomType] = useState<QuickSearchRoomType>('');

  function handleSearch() {
    document.getElementById('discovery-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const fieldLabelClass = 'flex items-center gap-1 text-xs font-medium text-muted-foreground';
  const fieldInputClass =
    'h-10 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="mx-auto w-full max-w-4xl rounded-2xl border bg-background/80 p-3 shadow-lg backdrop-blur-sm sm:p-4"
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-left">
          <span className={fieldLabelClass}>
            <MapPin className="h-3.5 w-3.5" /> {t('discovery.regionLabel')}
          </span>
          <select value={region} onChange={(event) => onRegionChange(event.target.value)} className={fieldInputClass}>
            <option value="">{t('discovery.allRegions')}</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-left">
          <span className={fieldLabelClass}>
            <Calendar className="h-3.5 w-3.5" /> {t('booking.checkIn')}
          </span>
          <input
            type="date"
            id="discovery-search-checkin"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className={fieldInputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-left">
          <span className={fieldLabelClass}>
            <Calendar className="h-3.5 w-3.5" /> {t('booking.checkOut')}
          </span>
          <input
            type="date"
            id="discovery-search-checkout"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className={fieldInputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-left">
          <span className={fieldLabelClass}>
            <Users className="h-3.5 w-3.5" /> {t('home.searchGuests')}
          </span>
          <input
            type="number"
            min={1}
            id="discovery-search-guests"
            value={guests}
            onChange={(event) => setGuests(Math.max(1, Number(event.target.value)))}
            className={fieldInputClass}
          />
        </label>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1 text-left">
          <span className={fieldLabelClass}>
            <BedDouble className="h-3.5 w-3.5" /> {t('home.searchRoomType')}
          </span>
          <select
            value={roomType}
            onChange={(event) => setRoomType(event.target.value as QuickSearchRoomType)}
            className={fieldInputClass}
          >
            <option value="">{t('home.searchRoomTypeAny')}</option>
            <option value="PRIVATE">{t('room.type_PRIVATE')}</option>
            <option value="SHARED">{t('room.type_SHARED')}</option>
          </select>
        </label>

        <motion.button
          type="button"
          onClick={handleSearch}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex h-10 w-full shrink-0 items-center justify-center gap-1.5 self-end rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition-shadow hover:shadow-lg hover:shadow-primary/30 sm:w-auto"
        >
          <Search className="h-4 w-4" /> {t('home.searchButton')}
        </motion.button>
      </div>
    </motion.div>
  );
}
