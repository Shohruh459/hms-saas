'use client';

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { HotelBadges } from './hotel-badges';
import { HotelBookButton } from './hotel-book-button';

export function HotelRatingList({ hotels }: { hotels: DiscoveryHotel[] }) {
  const { t } = useTranslations();

  if (hotels.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{t('discovery.noHotels')}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hotels.map((hotel, index) => (
        <motion.div
          key={hotel.id}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.06 }}
        >
          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/15">
            <CardHeader className="space-y-2">
              <HotelBadges hotel={hotel} rank={index} />
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{hotel.name}</span>
                <span className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-amber-500">
                  {hotel.rating ? `★ ${hotel.rating}` : t('discovery.noRating')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {hotel.region ?? hotel.address ?? '—'}
              </p>
              <HotelBookButton
                subdomain={hotel.subdomain}
                className="w-full transition-transform group-hover:scale-[1.02]"
              />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
