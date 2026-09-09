'use client';

import { DiscoveryHome } from '../../components/discovery/discovery-home';
import { TenantHomePage } from '../../components/tenant-home-page';

/**
 * NEXT_PUBLIC_TENANT_ID o'rnatilgan bo'lsa (bitta mehmonxonaga bog'langan
 * deploy) — o'sha mehmonxonaning mehmon portali ko'rsatiladi. Aks holda
 * (platforma darajasidagi deploy) — barcha faol mehmonxonalarni kashf
 * etish sahifasi ko'rsatiladi.
 */
export default function HomePage() {
  if (!process.env.NEXT_PUBLIC_TENANT_ID) {
    return <DiscoveryHome />;
  }
  return <TenantHomePage />;
}
