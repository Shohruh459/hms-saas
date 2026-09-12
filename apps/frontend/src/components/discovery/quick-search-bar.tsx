'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BedDouble, MapPin, Search, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DateField, formatShortLocalizedDate } from '../ui/date-field';
import { useTranslations } from '../../lib/i18n-provider';
import { cn } from '../../lib/utils';

export type QuickSearchRoomType = '' | 'PRIVATE' | 'SHARED';

const fieldLabelClass = 'flex items-center gap-1 text-xs font-medium text-muted-foreground';
const fieldInputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:rounded-md sm:px-2';

/**
 * Bosh sahifa hero qismidagi qidiruv paneli. Hudud (backend'ga ulangan,
 * natijalarni haqiqatan filtrlaydi), sana/mehmon/xona turi (foydalanuvchi
 * niyatini yig'ish uchun — Discovery API hali bu maydonlar bo'yicha
 * filtrlashni qo'llab-quvvatlamaydi). Mobilda (sm va undan kichik) 1
 * qatorli ixcham trigger ko'rinishida, bosilganda pastdan chiqadigan
 * Bottom Sheet ichida to'liq forma ochiladi; desktopda forma to'g'ridan
 * to'g'ri ko'rinadi.
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
  const { t, locale } = useTranslations();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [roomType, setRoomType] = useState<QuickSearchRoomType>('');
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
    };
  }, [sheetOpen]);

  function handleSearch() {
    document.getElementById('discovery-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const summaryWhere = region || t('home.searchWherePlaceholder');
  const summaryDates =
    checkIn && checkOut
      ? `${formatShortLocalizedDate(checkIn, locale)} – ${formatShortLocalizedDate(checkOut, locale)}`
      : t('home.searchDatesPlaceholder');
  const summaryGuests = `${guests} ${t('room.capacity')}`;

  const sharedFieldProps = {
    regions,
    region,
    onRegionChange,
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,
    guests,
    setGuests,
    roomType,
    setRoomType,
    locale,
  };

  return (
    <>
      {/* Mobil — ixcham 1 qatorli trigger, bosilganda Bottom Sheet ochiladi */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-full border bg-background/90 px-4 py-3 text-left shadow-md backdrop-blur-sm sm:hidden"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm">
          <span className={region ? 'text-foreground' : 'text-muted-foreground'}>{summaryWhere}</span>
          <span className="text-muted-foreground"> • {summaryDates} • {summaryGuests}</span>
        </span>
      </button>

      {/* Desktop — to'liq forma to'g'ridan to'g'ri ko'rinadi */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mx-auto hidden w-full max-w-4xl rounded-2xl border bg-background/80 p-4 shadow-lg backdrop-blur-sm sm:block"
      >
        <SearchFields idPrefix="discovery-search-desktop" {...sharedFieldProps} />
        <SearchSubmitButton onClick={handleSearch} className="mt-3" />
      </motion.div>

      {/* Mobil Bottom Sheet — barcha filtrlar */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="search-sheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 sm:hidden"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              key="search-sheet-panel"
              role="dialog"
              aria-modal="true"
              aria-label={t('home.searchButton')}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
              className="fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-background p-5 shadow-2xl sm:hidden"
              style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" aria-hidden="true" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">{t('home.searchButton')}</h2>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  onClick={() => setSheetOpen(false)}
                  className="rounded-sm p-1.5 transition-colors hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SearchFields idPrefix="discovery-search-sheet" {...sharedFieldProps} />
              <SearchSubmitButton
                onClick={() => {
                  handleSearch();
                  setSheetOpen(false);
                }}
                className="mt-4"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SearchFields({
  idPrefix,
  regions,
  region,
  onRegionChange,
  checkIn,
  setCheckIn,
  checkOut,
  setCheckOut,
  guests,
  setGuests,
  roomType,
  setRoomType,
  locale,
}: {
  idPrefix: string;
  regions: string[];
  region: string;
  onRegionChange: (region: string) => void;
  checkIn: string;
  setCheckIn: (value: string) => void;
  checkOut: string;
  setCheckOut: (value: string) => void;
  guests: number;
  setGuests: (value: number) => void;
  roomType: QuickSearchRoomType;
  setRoomType: (value: QuickSearchRoomType) => void;
  locale: string;
}) {
  const { t } = useTranslations();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
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
          <span className={fieldLabelClass}>{t('booking.checkIn')}</span>
          <DateField
            id={`${idPrefix}-checkin`}
            value={checkIn}
            onChange={setCheckIn}
            placeholder={t('booking.checkIn')}
            locale={locale}
          />
        </label>

        <label className="flex flex-col gap-1 text-left">
          <span className={fieldLabelClass}>{t('booking.checkOut')}</span>
          <DateField
            id={`${idPrefix}-checkout`}
            value={checkOut}
            onChange={setCheckOut}
            placeholder={t('booking.checkOut')}
            locale={locale}
            min={checkIn || undefined}
          />
        </label>

        <label className="flex flex-col gap-1 text-left">
          <span className={fieldLabelClass}>
            <Users className="h-3.5 w-3.5" /> {t('home.searchGuests')}
          </span>
          <input
            type="number"
            min={1}
            id={`${idPrefix}-guests`}
            value={guests}
            onChange={(event) => setGuests(Math.max(1, Number(event.target.value)))}
            className={fieldInputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-left">
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
    </div>
  );
}

function SearchSubmitButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const { t } = useTranslations();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md transition-shadow hover:shadow-lg hover:shadow-primary/30 sm:h-10 sm:w-auto sm:self-end sm:rounded-md sm:px-5',
        className,
      )}
    >
      <Search className="h-4 w-4" /> {t('home.searchButton')}
    </motion.button>
  );
}
