'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteHeader } from '../../../components/site-header';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { toast } from '../../../hooks/use-toast';
import { cancelBooking, fetchMyBookings } from '../../../lib/api/bookings';
import type { Booking } from '../../../lib/api/types';
import { useTranslations } from '../../../lib/i18n-provider';

export default function MyBookingsPage() {
  const { t, locale } = useTranslations();
  const [bookings, setBookings] = useState<Booking[]>([]);

  async function load() {
    try {
      setBookings(await fetchMyBookings());
    } catch {
      setBookings([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(id: string) {
    try {
      await cancelBooking(id);
      toast({ title: t('booking.cancelled'), variant: 'success' });
      load();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="container space-y-4 py-8">
        <h1 className="text-2xl font-bold">{t('booking.myBookingsTitle')}</h1>
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{booking.room?.roomNumber ?? booking.roomId}</span>
                  <Badge>{t(`booking.status_${booking.status}`)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  <div>
                    {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}
                  </div>
                  <div>
                    {Number(booking.totalPrice).toLocaleString()} so&apos;m · {t(`booking.payment_${booking.paymentStatus}`)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {booking.paymentStatus !== 'PAID' && booking.status !== 'CANCELLED' && (
                    <Link href={`/${locale}/bookings/${booking.id}/pay`}>
                      <Button size="sm">{t('booking.goToPayment')}</Button>
                    </Link>
                  )}
                  {booking.status !== 'CANCELLED' && (
                    <Button size="sm" variant="outline" onClick={() => handleCancel(booking.id)}>
                      {t('booking.cancel')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
