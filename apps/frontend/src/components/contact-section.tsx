'use client';

import { Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchPublicTenant } from '../lib/api/tenant';
import type { PublicTenant } from '../lib/api/types';
import { useTranslations } from '../lib/i18n-provider';
import { Button } from './ui/button';

export function ContactSection() {
  const { t } = useTranslations();
  const [tenant, setTenant] = useState<PublicTenant | null>(null);

  useEffect(() => {
    fetchPublicTenant()
      .then(setTenant)
      .catch(() => setTenant(null));
  }, []);

  if (!tenant) return null;

  const hasCoords = tenant.latitude != null && tenant.longitude != null;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${tenant.longitude! - 0.01}%2C${tenant.latitude! - 0.01}%2C${
        tenant.longitude! + 0.01
      }%2C${tenant.latitude! + 0.01}&layer=mapnik&marker=${tenant.latitude}%2C${tenant.longitude}`
    : null;

  return (
    <section className="grid gap-6 rounded-lg border bg-card p-6 md:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">{t('home.contactTitle')}</h2>
        {tenant.address && (
          <p className="text-sm text-muted-foreground">
            {t('home.addressLabel')}: {tenant.address}
          </p>
        )}
        {tenant.phone && (
          <a href={`tel:${tenant.phone}`}>
            <Button className="gap-2">
              <Phone className="h-4 w-4" /> {t('home.callNow')} ({tenant.phone})
            </Button>
          </a>
        )}
      </div>
      {mapSrc && <iframe title="map" src={mapSrc} className="h-64 w-full rounded-md border" loading="lazy" />}
    </section>
  );
}
