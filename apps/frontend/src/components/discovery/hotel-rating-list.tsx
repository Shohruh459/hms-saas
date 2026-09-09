'use client';

import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { HotelBookButton } from './hotel-book-button';

export function HotelRatingList({ hotels }: { hotels: DiscoveryHotel[] }) {
  const { t } = useTranslations();

  if (hotels.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{t('discovery.noHotels')}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hotels.map((hotel) => (
        <Card key={hotel.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span>{hotel.name}</span>
              <Badge variant={hotel.rating ? 'success' : 'secondary'}>
                {hotel.rating ? `★ ${hotel.rating}` : t('discovery.noRating')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{hotel.region ?? hotel.address ?? '—'}</p>
            <HotelBookButton subdomain={hotel.subdomain} className="w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
