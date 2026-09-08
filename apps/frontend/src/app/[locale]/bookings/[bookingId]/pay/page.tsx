'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SiteHeader } from '../../../../../components/site-header';
import { Button } from '../../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/ui/tabs';
import { toast } from '../../../../../hooks/use-toast';
import { fetchMyBookings } from '../../../../../lib/api/bookings';
import { buildClickCheckoutUrl, buildPaymeCheckoutUrl, createStripeCheckoutSession } from '../../../../../lib/api/payments';
import { fetchPublicTenant } from '../../../../../lib/api/tenant';
import type { Booking, PublicTenant } from '../../../../../lib/api/types';
import { useTranslations } from '../../../../../lib/i18n-provider';

export default function PayBookingPage() {
  const { t, locale } = useTranslations();
  const params = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetchMyBookings()
      .then((list) => setBooking(list.find((item) => item.id === params.bookingId) ?? null))
      .catch(() => setBooking(null));
    fetchPublicTenant()
      .then(setTenant)
      .catch(() => setTenant(null));
  }, [params.bookingId]);

  if (!booking || !tenant) return null;

  const currentBooking = booking;
  const currentTenant = tenant;
  const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}/${locale}/bookings` : '';

  function handleClick() {
    const url = buildClickCheckoutUrl(currentTenant, currentBooking, returnUrl);
    if (!url) {
      toast({ title: t('payment.notConfigured'), variant: 'destructive' });
      return;
    }
    window.location.href = url;
  }

  function handlePayme() {
    const url = buildPaymeCheckoutUrl(currentTenant, currentBooking);
    if (!url) {
      toast({ title: t('payment.notConfigured'), variant: 'destructive' });
      return;
    }
    window.location.href = url;
  }

  async function handleStripe() {
    if (!currentTenant.payments.stripe) {
      toast({ title: t('payment.notConfigured'), variant: 'destructive' });
      return;
    }
    setRedirecting(true);
    try {
      const session = await createStripeCheckoutSession(currentBooking.id, returnUrl, returnUrl);
      window.location.href = session.url;
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="container flex justify-center py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('payment.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-lg font-semibold">{Number(booking.totalPrice).toLocaleString()} so&apos;m</p>
            <Tabs defaultValue="click">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="click">Click</TabsTrigger>
                <TabsTrigger value="payme">Payme</TabsTrigger>
                <TabsTrigger value="stripe">Stripe</TabsTrigger>
              </TabsList>
              <TabsContent value="click">
                <Button className="w-full" onClick={handleClick}>
                  {t('payment.click')}
                </Button>
              </TabsContent>
              <TabsContent value="payme">
                <Button className="w-full" onClick={handlePayme}>
                  {t('payment.payme')}
                </Button>
              </TabsContent>
              <TabsContent value="stripe">
                <Button className="w-full" disabled={redirecting} onClick={handleStripe}>
                  {redirecting ? t('payment.redirecting') : t('payment.stripe')}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
