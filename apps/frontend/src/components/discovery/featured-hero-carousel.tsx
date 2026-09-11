'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { HotelBadges } from './hotel-badges';
import { HotelBookButton } from './hotel-book-button';

const AUTO_ADVANCE_MS = 6000;

/**
 * Bosh sahifaning tepasidagi glassmorphism "Hero" karuseli — reyting
 * bo'yicha eng yaxshi 3 mehmonxonani (video fon, reyting/nishonlar,
 * "Hozir bron qilish" / "Videoni ko'rish" CTA'lari bilan) ajratib ko'rsatadi.
 */
export function FeaturedHeroCarousel({
  hotels,
  onWatchVideo,
}: {
  hotels: DiscoveryHotel[];
  onWatchVideo: (hotelId: string) => void;
}) {
  const { t } = useTranslations();
  const top3 = hotels.slice(0, 3);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (top3.length <= 1) return;
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % top3.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [top3.length]);

  useEffect(() => {
    if (index >= top3.length) setIndex(0);
  }, [top3.length, index]);

  if (top3.length === 0) return null;

  const hotel = top3[index];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="space-y-3"
    >
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">{t('discovery.featuredTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('discovery.featuredSubtitle')}</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border shadow-xl">
        <div className="relative h-[380px] w-full sm:h-[460px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={hotel.id}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              {hotel.videoUrl ? (
                <video
                  src={hotel.videoUrl}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/70 to-slate-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="max-w-lg space-y-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md sm:p-6"
                >
                  <HotelBadges hotel={hotel} rank={index} />
                  <h3 className="text-xl font-bold sm:text-3xl">{hotel.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-white/90">
                    {hotel.rating !== null && (
                      <span className="flex items-center gap-1 font-semibold text-amber-300">★ {hotel.rating}</span>
                    )}
                    {hotel.region && <span>{hotel.region}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <HotelBookButton subdomain={hotel.subdomain} />
                    {hotel.videoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-white/40 bg-white/10 text-white hover:bg-white/20"
                        onClick={() => onWatchVideo(hotel.id)}
                      >
                        <PlayCircle className="h-4 w-4" /> {t('discovery.watchVideoCta')}
                      </Button>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {top3.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={() => setIndex((prev) => (prev - 1 + top3.length) % top3.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={() => setIndex((prev) => (prev + 1) % top3.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute right-4 top-4 flex gap-1.5">
                {top3.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Slide ${itemIndex + 1}`}
                    onClick={() => setIndex(itemIndex)}
                    className={cn(
                      'h-2 rounded-full bg-white/50 transition-all',
                      itemIndex === index ? 'w-6 bg-white' : 'w-2',
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
