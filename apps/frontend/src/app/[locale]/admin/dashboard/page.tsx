'use client';

import { useEffect, useState } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { toast } from '../../../../hooks/use-toast';
import { useSocketEvent } from '../../../../hooks/use-socket';
import { fetchAdminRooms, updateRoomStatus } from '../../../../lib/api/rooms';
import type { Room, RoomStatus } from '../../../../lib/api/types';
import { useTranslations } from '../../../../lib/i18n-provider';
import { cn } from '../../../../lib/utils';

const STATUS_OPTIONS: RoomStatus[] = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];

const STATUS_STYLES: Record<RoomStatus, string> = {
  AVAILABLE: 'border-emerald-400 bg-emerald-50',
  OCCUPIED: 'border-blue-400 bg-blue-50',
  CLEANING: 'border-amber-400 bg-amber-50',
  MAINTENANCE: 'border-red-400 bg-red-50',
};

const STATUS_BADGE_VARIANT: Record<RoomStatus, 'success' | 'secondary' | 'warning' | 'destructive'> = {
  AVAILABLE: 'success',
  OCCUPIED: 'secondary',
  CLEANING: 'warning',
  MAINTENANCE: 'destructive',
};

export default function AdminDashboardPage() {
  const { t } = useTranslations();
  const [rooms, setRooms] = useState<Room[]>([]);

  async function load() {
    try {
      setRooms(await fetchAdminRooms());
    } catch {
      setRooms([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useSocketEvent<Room>('room.status_changed', (updated) => {
    setRooms((prev) => prev.map((room) => (room.id === updated.id ? updated : room)));
  });

  async function handleStatusChange(roomId: string, status: RoomStatus) {
    try {
      const updated = await updateRoomStatus(roomId, status);
      setRooms((prev) => prev.map((room) => (room.id === roomId ? updated : room)));
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('admin.dashboard')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {rooms.map((room) => (
          <Card key={room.id} className={cn('border-2', STATUS_STYLES[room.status])}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{room.roomNumber}</span>
                <Badge variant={STATUS_BADGE_VARIANT[room.status]}>{t(`room.status_${room.status}`)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-muted-foreground">
                {room.type} · {room.floor}-qavat
              </p>
              <select
                value={room.status}
                onChange={(event) => handleStatusChange(room.id, event.target.value as RoomStatus)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`room.status_${status}`)}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
