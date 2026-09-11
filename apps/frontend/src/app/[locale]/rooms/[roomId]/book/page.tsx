'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { SiteHeader } from '../../../../../components/site-header';
import { Button } from '../../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Input } from '../../../../../components/ui/input';
import { Label } from '../../../../../components/ui/label';
import { toast } from '../../../../../hooks/use-toast';
import { createBooking } from '../../../../../lib/api/bookings';
import { fetchPublicRooms } from '../../../../../lib/api/rooms';
import type { Room } from '../../../../../lib/api/types';
import type { GuestGender } from '../../../../../lib/api/types';
import { useAuth } from '../../../../../lib/auth-context';
import { useTranslations } from '../../../../../lib/i18n-provider';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function BookRoomPage() {
  const { t, locale } = useTranslations();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ roomId: string }>();

  const [room, setRoom] = useState<Room | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestGender, setGuestGender] = useState<GuestGender>('MALE');
  const [bedsBooked, setBedsBooked] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPublicRooms()
      .then((rooms) => setRoom(rooms.find((item) => item.id === params.roomId) ?? null))
      .catch(() => setRoom(null));
  }, [params.roomId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [authLoading, user, locale, router]);

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / MS_PER_DAY))
      : 0;
  const isShared = room?.type === 'SHARED';
  const unitPrice = isShared ? Number(room?.pricePerBed ?? 0) * bedsBooked : Number(room?.pricePerNight ?? 0);
  const total = room ? nights * unitPrice : 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!room || nights <= 0) return;

    setSubmitting(true);
    try {
      const booking = await createBooking({
        roomId: room.id,
        checkIn,
        checkOut,
        guestGender: isShared ? guestGender : undefined,
        bedsBooked: isShared ? bedsBooked : undefined,
      });
      toast({ title: t('booking.success'), variant: 'success' });
      router.push(`/${locale}/bookings/${booking.id}/pay`);
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!room) return null;

  return (
    <>
      <SiteHeader />
      <main className="container flex justify-center py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {t('booking.title')} — {room.roomNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="checkIn">{t('booking.checkIn')}</Label>
                <Input
                  id="checkIn"
                  type="date"
                  required
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="checkOut">{t('booking.checkOut')}</Label>
                <Input
                  id="checkOut"
                  type="date"
                  required
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                />
              </div>
              {isShared && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="guestGender">{t('booking.guestGenderLabel')}</Label>
                    <select
                      id="guestGender"
                      value={guestGender}
                      onChange={(event) => setGuestGender(event.target.value as GuestGender)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="MALE">{t('booking.genderMale')}</option>
                      <option value="FEMALE">{t('booking.genderFemale')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bedsBooked">{t('booking.bedsCountLabel')}</Label>
                    <Input
                      id="bedsBooked"
                      type="number"
                      min={1}
                      max={room.totalBeds}
                      required
                      value={bedsBooked}
                      onChange={(event) => setBedsBooked(Number(event.target.value))}
                    />
                  </div>
                </>
              )}
              {nights > 0 && (
                <p className="text-sm text-muted-foreground">
                  {nights} {t('booking.nights')} × {unitPrice.toLocaleString()} ={' '}
                  <strong className="text-foreground">{total.toLocaleString()}</strong>
                </p>
              )}
              <Button type="submit" disabled={submitting || nights <= 0} className="w-full">
                {t('booking.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
