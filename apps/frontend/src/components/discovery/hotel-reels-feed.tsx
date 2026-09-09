'use client';

import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { HotelBookButton } from './hotel-book-button';

/** Instagram Reels/TikTok uslubidagi vertikal scroll-snap video feed. */
export function HotelReelsFeed({ hotels }: { hotels: DiscoveryHotel[] }) {
  const { t } = useTranslations();

  if (hotels.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{t('discovery.noHotels')}</p>;
  }

  return (
    <div className="h-[calc(100vh-260px)] max-h-[720px] min-h-[420px] snap-y snap-mandatory overflow-y-scroll rounded-lg border bg-black">
      {hotels.map((hotel) => (
        <div key={hotel.id} className="relative flex h-full w-full snap-start items-center justify-center bg-black">
          {hotel.videoUrl && (
            <video
              src={hotel.videoUrl}
              className="h-full w-full object-cover"
              muted
              loop
              playsInline
              autoPlay
              controls={false}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white">
            <p className="text-lg font-semibold">{hotel.name}</p>
            <p className="text-sm opacity-90">
              {hotel.rating ? `★ ${hotel.rating}` : t('discovery.noRating')}
              {hotel.region ? ` · ${hotel.region}` : ''}
            </p>
            <HotelBookButton subdomain={hotel.subdomain} />
          </div>
        </div>
      ))}
    </div>
  );
}
