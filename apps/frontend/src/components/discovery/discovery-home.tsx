'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { ContactSection } from '../contact-section';
import { SiteHeader } from '../site-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { fetchDiscoveryHotels } from '../../lib/api/discovery';
import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { HotelRatingList } from './hotel-rating-list';
import { HotelReelsFeed } from './hotel-reels-feed';

// Leaflet `window`ga bog'liq — server-side render qilinmasligi kerak.
const HotelMap = dynamic(() => import('./hotel-map').then((mod) => mod.HotelMap), { ssr: false });

/**
 * Platforma darajasidagi (NEXT_PUBLIC_TENANT_ID o'rnatilmagan deploy) bosh
 * sahifa — faol va videosi tasdiqlangan mehmonxonalarni 3 rejimda ko'rsatadi:
 * reyting ro'yxati, xarita va Reels-uslubidagi video feed.
 */
export function DiscoveryHome() {
  const { t } = useTranslations();
  const [allHotels, setAllHotels] = useState<DiscoveryHotel[]>([]);
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <SiteHeader />
      <main className="container space-y-6 py-8">
        <section className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">{t('home.heroTitle')}</h1>
          <p className="text-muted-foreground">{t('home.heroSubtitle')}</p>
        </section>

        {regions.length > 0 && (
          <div className="flex justify-center">
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('discovery.allRegions')}</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <p className="text-center text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <Tabs defaultValue="rating">
            <TabsList className="mx-auto flex w-fit">
              <TabsTrigger value="rating">{t('discovery.modeRating')}</TabsTrigger>
              <TabsTrigger value="map">{t('discovery.modeMap')}</TabsTrigger>
              <TabsTrigger value="reels">{t('discovery.modeReels')}</TabsTrigger>
            </TabsList>
            <TabsContent value="rating">
              <HotelRatingList hotels={hotels} />
            </TabsContent>
            <TabsContent value="map">
              <HotelMap hotels={hotels} />
            </TabsContent>
            <TabsContent value="reels">
              <HotelReelsFeed hotels={hotels} />
            </TabsContent>
          </Tabs>
        )}

        <ContactSection />
      </main>
    </>
  );
}
