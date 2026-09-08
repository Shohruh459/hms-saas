import type { Room } from '../lib/api/types';
import { useTranslations } from '../lib/i18n-provider';
import { RoomCard } from './room-card';

export function RoomGrid({ rooms }: { rooms: Room[] }) {
  const { t } = useTranslations();

  if (rooms.length === 0) {
    return <p className="py-10 text-center text-muted-foreground">{t('home.noRooms')}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
