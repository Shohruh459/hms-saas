import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, createHmac } from 'crypto';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function clickSign(parts: unknown[]): string {
  return createHash('md5').update(parts.join('')).digest('hex');
}

function basicAuth(login: string, password: string): string {
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
}

describe('Payments (Click/Payme/Stripe) (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;

  const clickSecret = 'click-secret-key';
  const paymeSecret = 'payme-secret-key';
  const stripeWebhookSecret = 'whsec_test_secret';

  let ownerToken: string;
  let guestToken: string;
  const suffix = Date.now();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    prisma = app.get(PrismaService);

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Payments Test Hotel',
        subdomain: `payments-hotel-${Date.now()}`,
        paymentKeys: {
          click: { merchantId: 'M1', serviceId: 'S1', secretKey: clickSecret },
          payme: { merchantId: 'PM1', secretKey: paymeSecret },
          stripe: { webhookSecret: stripeWebhookSecret },
        },
      },
    });

    const ownerRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Hotel Owner',
      email: `owner-${suffix}@test.uz`,
      password: 'OwnerPass123',
      role: 'HOTEL_OWNER',
      tenantId: tenant.id,
    });
    ownerToken = ownerRes.body.accessToken;

    const guestRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Guest',
      email: `guest-${suffix}@test.uz`,
      password: 'GuestPass123',
      role: 'GUEST',
      tenantId: tenant.id,
    });
    guestToken = guestRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createRoomAndBooking(roomNumber: string, checkIn: string, checkOut: string) {
    const roomRes = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roomNumber, floor: 1, type: 'Standard', pricePerNight: 100000 });

    const bookingRes = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: roomRes.body.id, checkIn, checkOut });

    return bookingRes.body as { id: string; totalPrice: string };
  }

  describe('Click', () => {
    let bookingId: string;
    let totalPrice: number;

    beforeAll(async () => {
      const booking = await createRoomAndBooking('C-101', '2027-01-01', '2027-01-02');
      bookingId = booking.id;
      totalPrice = Number(booking.totalPrice);
    });

    it("noto'g'ri imzo bilan prepare -1 qaytaradi", async () => {
      const res = await request(app.getHttpServer()).post('/payments/click/prepare').send({
        click_trans_id: `click-${suffix}`,
        service_id: 'S1',
        merchant_trans_id: bookingId,
        amount: totalPrice,
        action: '0',
        sign_time: '2027-01-01 09:00:00',
        sign_string: 'not-a-valid-sign',
      });
      expect(res.status).toBe(200);
      expect(res.body.error).toBe(-1);
    });

    it("to'g'ri oqim: prepare -> complete -> booking.paymentStatus = PAID", async () => {
      const prepareParts = [`click-${suffix}`, 'S1', clickSecret, bookingId, totalPrice, '0', '2027-01-01 09:00:00'];
      const prepareRes = await request(app.getHttpServer()).post('/payments/click/prepare').send({
        click_trans_id: `click-${suffix}`,
        service_id: 'S1',
        merchant_trans_id: bookingId,
        amount: totalPrice,
        action: '0',
        sign_time: '2027-01-01 09:00:00',
        sign_string: clickSign(prepareParts),
      });
      expect(prepareRes.body.error).toBe(0);
      expect(prepareRes.body.merchant_prepare_id).toBe(`click-${suffix}`);

      const completeParts = [
        `click-${suffix}`,
        'S1',
        clickSecret,
        bookingId,
        `click-${suffix}`,
        totalPrice,
        '1',
        '2027-01-01 09:01:00',
      ];
      const completeRes = await request(app.getHttpServer()).post('/payments/click/complete').send({
        click_trans_id: `click-${suffix}`,
        service_id: 'S1',
        merchant_trans_id: bookingId,
        merchant_prepare_id: `click-${suffix}`,
        amount: totalPrice,
        action: '1',
        sign_time: '2027-01-01 09:01:00',
        error: '0',
        sign_string: clickSign(completeParts),
      });
      expect(completeRes.body.error).toBe(0);
      expect(completeRes.body.merchant_confirm_id).toBe(`click-${suffix}`);

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.paymentStatus).toBe('PAID');
      expect(booking?.status).toBe('CONFIRMED');
    });
  });

  describe('Payme', () => {
    let bookingId: string;
    let amountTiyin: number;
    const transactionId = `payme-tx-${suffix}`;

    beforeAll(async () => {
      const booking = await createRoomAndBooking('P-101', '2027-02-01', '2027-02-02');
      bookingId = booking.id;
      amountTiyin = Math.round(Number(booking.totalPrice) * 100);
    });

    it("noto'g'ri parol bilan CheckPerformTransaction -32504 qaytaradi", async () => {
      const res = await request(app.getHttpServer())
        .post('/payments/payme')
        .set('Authorization', basicAuth('Paycom', 'wrong-secret'))
        .send({ method: 'CheckPerformTransaction', params: { amount: amountTiyin, account: { booking_id: bookingId } }, id: 1 });
      expect(res.body.error.code).toBe(-32504);
    });

    it("to'liq oqim: CheckPerform -> Create -> Perform -> Check -> Cancel(refund)", async () => {
      const auth = basicAuth('Paycom', paymeSecret);

      const checkRes = await request(app.getHttpServer())
        .post('/payments/payme')
        .set('Authorization', auth)
        .send({ method: 'CheckPerformTransaction', params: { amount: amountTiyin, account: { booking_id: bookingId } }, id: 1 });
      expect(checkRes.body.result).toEqual({ allow: true });

      const createRes = await request(app.getHttpServer())
        .post('/payments/payme')
        .set('Authorization', auth)
        .send({
          method: 'CreateTransaction',
          params: { id: transactionId, time: Date.now(), amount: amountTiyin, account: { booking_id: bookingId } },
          id: 2,
        });
      expect(createRes.body.result.state).toBe(1);

      const performRes = await request(app.getHttpServer())
        .post('/payments/payme')
        .set('Authorization', auth)
        .send({ method: 'PerformTransaction', params: { id: transactionId }, id: 3 });
      expect(performRes.body.result.state).toBe(2);

      const bookingAfterPay = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(bookingAfterPay?.paymentStatus).toBe('PAID');

      const checkTxRes = await request(app.getHttpServer())
        .post('/payments/payme')
        .set('Authorization', auth)
        .send({ method: 'CheckTransaction', params: { id: transactionId }, id: 4 });
      expect(checkTxRes.body.result.state).toBe(2);
      expect(checkTxRes.body.result.perform_time).toBeGreaterThan(0);

      const cancelRes = await request(app.getHttpServer())
        .post('/payments/payme')
        .set('Authorization', auth)
        .send({ method: 'CancelTransaction', params: { id: transactionId, reason: 1 }, id: 5 });
      expect(cancelRes.body.result.state).toBe(-2);

      const bookingAfterCancel = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(bookingAfterCancel?.paymentStatus).toBe('REFUNDED');
    });
  });

  describe('Stripe', () => {
    let bookingId: string;
    let amountCents: number;

    beforeAll(async () => {
      const booking = await createRoomAndBooking('S-101', '2027-03-01', '2027-03-02');
      bookingId = booking.id;
      amountCents = Math.round(Number(booking.totalPrice) * 100);
    });

    function buildSignature(payload: string, secret: string, timestamp: string) {
      const signedPayload = `${timestamp}.${payload}`;
      return createHmac('sha256', secret).update(signedPayload).digest('hex');
    }

    it("noto'g'ri imzo bilan 400 qaytaradi", async () => {
      const event = {
        id: `evt-${suffix}-1`,
        type: 'payment_intent.succeeded',
        data: { object: { id: `pi-${suffix}-1`, amount_received: amountCents, metadata: { bookingId } } },
      };
      const payload = JSON.stringify(event);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const res = await request(app.getHttpServer())
        .post('/payments/stripe/webhook')
        .set('stripe-signature', `t=${timestamp},v1=wrong-signature`)
        .set('Content-Type', 'application/json')
        .send(payload);
      expect(res.status).toBe(400);
    });

    it("to'g'ri imzo bilan bookingni PAID qiladi", async () => {
      const event = {
        id: `evt-${suffix}-2`,
        type: 'payment_intent.succeeded',
        data: { object: { id: `pi-${suffix}-2`, amount_received: amountCents, metadata: { bookingId } } },
      };
      const payload = JSON.stringify(event);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = buildSignature(payload, stripeWebhookSecret, timestamp);

      const res = await request(app.getHttpServer())
        .post('/payments/stripe/webhook')
        .set('stripe-signature', `t=${timestamp},v1=${signature}`)
        .set('Content-Type', 'application/json')
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body.received).toBe(true);

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.paymentStatus).toBe('PAID');
    });
  });
});
