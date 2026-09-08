'use client';

import { useEffect, useState } from 'react';
import { ContactSection } from '../../components/contact-section';
import { RoomFilters } from '../../components/room-filters';
import { RoomGrid } from '../../components/room-grid';
import { SiteHeader } from '../../components/site-header';
import { fetchPublicRooms, type PublicRoomFilters } from '../../lib/api/rooms';
import type { Room } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';

export default function GuestHomePage() {
  const { t } = useTranslations();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  async function search(filters: PublicRoomFilters) {
    setLoading(true);
    try {
      const data = await fetchPublicRooms(filters);
      setRooms(data);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="container space-y-8 py-8">
        <section className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">{t('home.heroTitle')}</h1>
          <p className="text-muted-foreground">{t('home.heroSubtitle')}</p>
        </section>

        <RoomFilters onSearch={search} />

        {loading ? (
          <p className="text-center text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <RoomGrid rooms={rooms} />
        )}

        <ContactSection />
      </main>
    </>
  );
}
