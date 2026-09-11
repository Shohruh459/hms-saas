'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { HotelBadges } from './hotel-badges';
import { HotelBookButton } from './hotel-book-button';

function ReelSlide({ hotel, rank }: { hotel: DiscoveryHotel; rank: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const slide = slideRef.current;
    if (!video || !slide) return;

    // Faqat ko'rinib turgan video ijro etiladi — ovoz/resurs tejash va
    // Reels-uslubidagi "faqat joriy video harakatlanadi" tajribasi uchun.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={slideRef}
      id={`reel-${hotel.id}`}
      className="relative flex h-full w-full snap-start items-center justify-center bg-black"
    >
      {hotel.videoUrl && (
        <video ref={videoRef} src={hotel.videoUrl} className="h-full w-full object-cover" muted loop playsInline />
      )}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ root: slideRef, amount: 0.6 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4"
      >
        <HotelBadges hotel={hotel} rank={rank} />
        <ReelInfo hotel={hotel} />
      </motion.div>
    </div>
  );
}

function ReelInfo({ hotel }: { hotel: DiscoveryHotel }) {
  const { t } = useTranslations();
  return (
    <div className="space-y-2 text-white">
      <p className="text-lg font-semibold">{hotel.name}</p>
      <p className="text-sm opacity-90">
        {hotel.rating ? `★ ${hotel.rating}` : t('discovery.noRating')}
        {hotel.region ? ` · ${hotel.region}` : ''}
      </p>
      <HotelBookButton subdomain={hotel.subdomain} />
    </div>
  );
}

/** Instagram Reels/TikTok uslubidagi vertikal scroll-snap video feed. */
export function HotelReelsFeed({ hotels, focusHotelId }: { hotels: DiscoveryHotel[]; focusHotelId?: string | null }) {
  const { t } = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusHotelId) return;
    const target = document.getElementById(`reel-${focusHotelId}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusHotelId]);

  if (hotels.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{t('discovery.noHotels')}</p>;
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-260px)] max-h-[720px] min-h-[420px] snap-y snap-mandatory overflow-y-scroll rounded-lg border bg-black"
    >
      {hotels.map((hotel, index) => (
        <ReelSlide key={hotel.id} hotel={hotel} rank={index} />
      ))}
    </div>
  );
}
