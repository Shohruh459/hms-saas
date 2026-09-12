'use client';

import { motion } from 'framer-motion';
import { List, Map, Video } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { ContactSection } from '../contact-section';
import { SiteHeader } from '../site-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { fetchDiscoveryHotels } from '../../lib/api/discovery';
import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { FeaturedHeroCarousel } from './featured-hero-carousel';
import { HotelRatingList } from './hotel-rating-list';
import { HotelReelsFeed } from './hotel-reels-feed';
import { QuickSearchBar } from './quick-search-bar';

// Leaflet `window`ga bog'liq — server-side render qilinmasligi kerak.
const HotelMap = dynamic(() => import('./hotel-map').then((mod) => mod.HotelMap), { ssr: false });

/**
 * Platforma darajasidagi (NEXT_PUBLIC_TENANT_ID o'rnatilmagan deploy) bosh
 * sahifa — faol va videosi tasdiqlangan mehmonxonalarni 3 rejimda ko'rsatadi:
 * reyting ro'yxati, xarita va Reels-uslubidagi video feed, ustida esa
 * top-3 mehmonxonani ajratib ko'rsatuvchi "Hero" karuseli bilan.
 */
export function DiscoveryHome() {
  const { t } = useTranslations();
  const [allHotels, setAllHotels] = useState<DiscoveryHotel[]>([]);
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rating');
  const [focusHotelId, setFocusHotelId] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscoveryHotels()
      .then(setAllHotels)
      .catch(() => setAllHotels([]))
      .finally(() => setLoading(false));
  }, []);

  const regions = useMemo(
    () => Array.from(new Set(allHotels.map((hotel) => hotel.region).filter((value): value is string => Boolean(value)))),
    [allHotels],
  );
  const hotels = useMemo(
    () => (region ? allHotels.filter((hotel) => hotel.region === region) : allHotels),
    [allHotels, region],
  );

  function handleWatchVideo(hotelId: string) {
    setFocusHotelId(hotelId);
    setActiveTab('reels');
  }

  return (
    <>
      <SiteHeader />
      <main className="container space-y-8 py-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2 text-center"
        >
          <h1 className="text-3xl font-bold">{t('home.heroTitle')}</h1>
          <p className="text-muted-foreground">{t('home.heroSubtitle')}</p>
        </motion.section>

        <QuickSearchBar regions={regions} region={region} onRegionChange={setRegion} />

        {!loading && hotels.length > 0 && <FeaturedHeroCarousel hotels={hotels} onWatchVideo={handleWatchVideo} />}

        {loading ? (
          <p className="text-center text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <Tabs id="discovery-results" value={activeTab} onValueChange={setActiveTab} className="pb-24 sm:pb-0">
            <TabsList
              className="fixed inset-x-3 bottom-3 z-30 flex w-auto items-center justify-around gap-1 rounded-2xl border bg-background/95 p-1.5 shadow-lg backdrop-blur-md sm:static sm:inset-auto sm:bottom-auto sm:z-auto sm:mx-auto sm:w-fit sm:justify-center sm:gap-1 sm:rounded-md sm:border-none sm:bg-secondary sm:p-1 sm:shadow-none sm:backdrop-blur-none"
            >
              <TabsTrigger
                value="rating"
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] sm:flex-none sm:flex-row sm:gap-1.5 sm:py-1.5 sm:text-sm"
              >
                <List className="h-5 w-5 sm:h-4 sm:w-4" /> {t('discovery.modeRating')}
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] sm:flex-none sm:flex-row sm:gap-1.5 sm:py-1.5 sm:text-sm"
              >
                <Map className="h-5 w-5 sm:h-4 sm:w-4" /> {t('discovery.modeMap')}
              </TabsTrigger>
              <TabsTrigger
                value="reels"
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] sm:flex-none sm:flex-row sm:gap-1.5 sm:py-1.5 sm:text-sm"
              >
                <Video className="h-5 w-5 sm:h-4 sm:w-4" /> {t('discovery.modeReels')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="rating">
              <HotelRatingList hotels={hotels} />
            </TabsContent>
            <TabsContent value="map">
              <HotelMap hotels={hotels} />
            </TabsContent>
            <TabsContent value="reels">
              <HotelReelsFeed hotels={hotels} focusHotelId={focusHotelId} />
            </TabsContent>
          </Tabs>
        )}

        <ContactSection />
      </main>
    </>
  );
}
