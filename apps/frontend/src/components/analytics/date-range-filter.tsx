'use client';

import { DateField } from '../ui/date-field';
import { useTranslations } from '../../lib/i18n-provider';
import { toDateStr } from '../../lib/analytics-format';
import { Button } from '../ui/button';

export type DateRangePreset = 'thisMonth' | 'last30' | 'thisYear' | 'custom';

export function resolvePresetRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  if (preset === 'thisMonth') {
    return { startDate: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: toDateStr(now) };
  }
  if (preset === 'thisYear') {
    return { startDate: toDateStr(new Date(now.getFullYear(), 0, 1)), endDate: toDateStr(now) };
  }
  const last30Start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { startDate: toDateStr(last30Start), endDate: toDateStr(now) };
}

export function DateRangeFilter({
  preset,
  customStart,
  customEnd,
  onPresetChange,
  onCustomRangeChange,
}: {
  preset: DateRangePreset;
  customStart: string;
  customEnd: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (startDate: string, endDate: string) => void;
}) {
  const { t, locale } = useTranslations();

  const presets: { key: DateRangePreset; label: string }[] = [
    { key: 'thisMonth', label: t('analytics.filterThisMonth') },
    { key: 'last30', label: t('analytics.filterLast30') },
    { key: 'thisYear', label: t('analytics.filterThisYear') },
    { key: 'custom', label: t('analytics.filterCustom') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((item) => (
        <Button
          key={item.key}
          type="button"
          size="sm"
          variant={preset === item.key ? 'default' : 'outline'}
          onClick={() => onPresetChange(item.key)}
        >
          {item.label}
        </Button>
      ))}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <DateField
            id="analytics-custom-start"
            value={customStart}
            onChange={(value) => onCustomRangeChange(value, customEnd)}
            placeholder={t('booking.checkIn')}
            locale={locale}
            className="w-36"
          />
          <span className="text-muted-foreground">–</span>
          <DateField
            id="analytics-custom-end"
            value={customEnd}
            onChange={(value) => onCustomRangeChange(customStart, value)}
            placeholder={t('booking.checkOut')}
            locale={locale}
            min={customStart || undefined}
            className="w-36"
          />
        </div>
      )}
    </div>
  );
}
