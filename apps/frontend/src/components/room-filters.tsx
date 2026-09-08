'use client';

import { useState, type FormEvent } from 'react';
import type { PublicRoomFilters } from '../lib/api/rooms';
import { useTranslations } from '../lib/i18n-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const AMENITY_OPTIONS = ['pool', 'gym', 'tennis', 'wifi', 'breakfast', 'parking'];

export function RoomFilters({ onSearch }: { onSearch: (filters: PublicRoomFilters) => void }) {
  const { t } = useTranslations();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [minRating, setMinRating] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);

  function toggleAmenity(value: string) {
    setAmenities((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch({
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      capacity: capacity ? Number(capacity) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      amenities,
    });
  }

  function handleReset() {
    setMinPrice('');
    setMaxPrice('');
    setCapacity('');
    setMinRating('');
    setAmenities([]);
    onSearch({});
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        <div className="space-y-1">
          <Label>{t('filters.minPrice')}</Label>
          <Input type="number" min={0} value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('filters.maxPrice')}</Label>
          <Input type="number" min={0} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('filters.capacity')}</Label>
          <Input type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('filters.minRating')}</Label>
          <Input
            type="number"
            min={0}
            max={5}
            step={0.5}
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">
            {t('filters.apply')}
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            {t('filters.reset')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{t('filters.amenities')}:</span>
        {AMENITY_OPTIONS.map((value) => (
          <label key={value} className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={amenities.includes(value)} onChange={() => toggleAmenity(value)} />
            {t(`filters.amenity_${value}`)}
          </label>
        ))}
      </div>
    </form>
  );
}
