'use client';

import { useState, type FormEvent } from 'react';
import { toast } from '../hooks/use-toast';
import { fetchPublicRooms } from '../lib/api/rooms';
import { createServiceRequest } from '../lib/api/service-requests';
import type { Room } from '../lib/api/types';
import { useTranslations } from '../lib/i18n-provider';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';

export function RoomServiceModal() {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && rooms.length === 0) {
      try {
        const data = await fetchPublicRooms();
        setRooms(data);
        if (data[0]) setRoomId(data[0].id);
      } catch {
        // Xonalar ro'yxatini yuklashda xatolik — foydalanuvchi qayta urinishi mumkin.
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!roomId || !reason.trim()) return;

    setSubmitting(true);
    try {
      await createServiceRequest({ roomId, reason });
      toast({ title: t('roomService.success'), variant: 'success' });
      setReason('');
      setOpen(false);
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {t('nav.callService')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('roomService.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="room-service-room">{t('roomService.roomLabel')}</Label>
            <select
              id="room-service-room"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} — {room.category}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="room-service-reason">{t('roomService.reasonLabel')}</Label>
            <textarea
              id="room-service-reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('roomService.reasonPlaceholder')}
              className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {t('roomService.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
