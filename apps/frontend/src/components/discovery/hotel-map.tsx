'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { DiscoveryHotel } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { HotelBookButton } from './hotel-book-button';

// Next.js/webpack Leaflet default marker ikonkalarini o'z asset yo'llari
// bilan to'g'ri hal qila olmaydi — shu sababli ikonkalar CDN'dan olinadi.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER: [number, number] = [41.3111, 69.2797]; // Toshkent

export function HotelMap({ hotels }: { hotels: DiscoveryHotel[] }) {
  const { t } = useTranslations();
  const withCoords = hotels.filter(
    (hotel): hotel is DiscoveryHotel & { latitude: number; longitude: number } =>
      hotel.latitude !== null && hotel.longitude !== null,
  );
  const center: [number, number] = withCoords.length > 0 ? [withCoords[0].latitude, withCoords[0].longitude] : DEFAULT_CENTER;

  return (
    <div className="h-[500px] overflow-hidden rounded-lg border">
      <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {withCoords.map((hotel) => (
          <Marker key={hotel.id} position={[hotel.latitude, hotel.longitude]}>
            <Popup>
              <div className="space-y-2">
                <p className="font-semibold">{hotel.name}</p>
                <p className="text-sm">{hotel.rating ? `★ ${hotel.rating}` : t('discovery.noRating')}</p>
                <HotelBookButton subdomain={hotel.subdomain} />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
