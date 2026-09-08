import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('SupportTickets & Bookings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;

  let ownerToken: string;
  let guest1Token: string;
  let guest2Token: string;
  let guest1Id: string;

  let roomId: string;
  let ticketId: string;
  let bookingId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    prisma = app.get(PrismaService);

    const tenant = await prisma.tenant.create({
      data: { name: 'Support & Booking Hotel', subdomain: `support-booking-${Date.now()}` },
    });
    const suffix = Date.now();

    const ownerRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Hotel Owner',
      email: `owner-${suffix}@test.uz`,
      password: 'OwnerPass123',
      role: 'HOTEL_OWNER',
      tenantId: tenant.id,
    });
    ownerToken = ownerRes.body.accessToken;

    const guest1Res = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Guest One',
      email: `guest1-${suffix}@test.uz`,
      password: 'GuestPass123',
      role: 'GUEST',
      tenantId: tenant.id,
    });
    guest1Token = guest1Res.body.accessToken;
    guest1Id = guest1Res.body.user.id;

    const guest2Res = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Guest Two',
      email: `guest2-${suffix}@test.uz`,
      password: 'GuestPass123',
      role: 'GUEST',
      tenantId: tenant.id,
    });
    guest2Token = guest2Res.body.accessToken;

    const roomRes = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roomNumber: '201', floor: 2, type: 'Deluxe', pricePerNight: 200000 });
    roomId = roomRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('SupportTickets', () => {
    let ownerSocket: Socket;
    let guest1Socket: Socket;

    const waitForConnect = (socket: Socket) => new Promise<void>((resolve) => socket.once('connect', () => resolve()));
    const waitForEvent = (socket: Socket, event: string) => new Promise<any>((resolve) => socket.once(event, resolve));

    beforeAll(async () => {
      ownerSocket = io(`${baseUrl}/notifications`, { auth: { token: ownerToken }, transports: ['websocket'] });
      guest1Socket = io(`${baseUrl}/notifications`, { auth: { token: guest1Token }, transports: ['websocket'] });
      await Promise.all([waitForConnect(ownerSocket), waitForConnect(guest1Socket)]);
    });

    afterAll(() => {
      ownerSocket.disconnect();
      guest1Socket.disconnect();
    });

    it("guest bilet yaratganda admin \"support-ticket.created\" oladi", async () => {
      const createdEvent = waitForEvent(ownerSocket, 'support-ticket.created');

      const res = await request(app.getHttpServer())
        .post('/support-tickets')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ type: 'COMPLAINT', message: "Xonada issiq suv yo'q" });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('OPEN');
      ticketId = res.body.id;

      const payload = await createdEvent;
      expect(payload.id).toBe(ticketId);
    });

    it('GUEST biletlar ro\'yxatini ko\'ra olmaydi -> 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/support-tickets')
        .set('Authorization', `Bearer ${guest1Token}`);
      expect(res.status).toBe(403);
    });

    it('Admin tenant biletlarini status bo\'yicha filtrlab ko\'radi', async () => {
      const res = await request(app.getHttpServer())
        .get('/support-tickets')
        .query({ status: 'OPEN' })
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.some((ticket: any) => ticket.id === ticketId)).toBe(true);
    });

    it('OPEN statusga javob qaytarish rad etiladi (faqat IN_PROGRESS/RESOLVED/CLOSED) -> 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/support-tickets/${ticketId}/respond`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ response: 'Tekshirilmoqda', status: 'OPEN' });
      expect(res.status).toBe(400);
    });

    it('Admin javob qaytarganda guest "support-ticket.responded" oladi', async () => {
      const respondedEvent = waitForEvent(guest1Socket, 'support-ticket.responded');

      const res = await request(app.getHttpServer())
        .patch(`/support-tickets/${ticketId}/respond`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ response: "Muammo bartaraf etildi", status: 'RESOLVED' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RESOLVED');

      const payload = await respondedEvent;
      expect(payload.id).toBe(ticketId);
      expect(payload.response).toBe('Muammo bartaraf etildi');
    });
  });

  describe('Bookings', () => {
    let ownerSocket: Socket;
    let guest1Socket: Socket;

    const waitForConnect = (socket: Socket) => new Promise<void>((resolve) => socket.once('connect', () => resolve()));
    const waitForEvent = (socket: Socket, event: string) => new Promise<any>((resolve) => socket.once(event, resolve));

    beforeAll(async () => {
      ownerSocket = io(`${baseUrl}/notifications`, { auth: { token: ownerToken }, transports: ['websocket'] });
      guest1Socket = io(`${baseUrl}/notifications`, { auth: { token: guest1Token }, transports: ['websocket'] });
      await Promise.all([waitForConnect(ownerSocket), waitForConnect(guest1Socket)]);
    });

    afterAll(() => {
      ownerSocket.disconnect();
      guest1Socket.disconnect();
    });

    it('checkOut checkIn dan oldin bo\'lsa -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ roomId, checkIn: '2026-12-05', checkOut: '2026-12-01' });
      expect(res.status).toBe(400);
    });

    it("guest xonani bron qiladi, totalPrice to'g'ri hisoblanadi, admin xabar oladi", async () => {
      const createdEvent = waitForEvent(ownerSocket, 'booking.created');

      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ roomId, checkIn: '2026-12-01', checkOut: '2026-12-04' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.paymentStatus).toBe('PENDING');
      expect(Number(res.body.totalPrice)).toBe(600000); // 3 kecha * 200000
      bookingId = res.body.id;

      const payload = await createdEvent;
      expect(payload.id).toBe(bookingId);
    });

    it("bir xil sanalarga takroriy bron -> 409", async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${guest2Token}`)
        .send({ roomId, checkIn: '2026-12-02', checkOut: '2026-12-03' });
      expect(res.status).toBe(409);
    });

    it('GUEST faqat o\'z bronlarini ko\'radi', async () => {
      const res = await request(app.getHttpServer()).get('/bookings').set('Authorization', `Bearer ${guest1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.every((booking: any) => booking.guestId === guest1Id)).toBe(true);
      expect(res.body.some((booking: any) => booking.id === bookingId)).toBe(true);
    });

    it("Admin tenant'dagi barcha bronlarni ko'radi", async () => {
      const res = await request(app.getHttpServer()).get('/bookings').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.some((booking: any) => booking.id === bookingId)).toBe(true);
    });

    it("boshqa mehmon bronni bekor qila olmaydi -> 403", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${guest2Token}`);
      expect(res.status).toBe(403);
    });

    it("admin bronni bekor qiladi, guest \"booking.cancelled\" oladi", async () => {
      const cancelledEvent = waitForEvent(guest1Socket, 'booking.cancelled');

      const res = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');

      const payload = await cancelledEvent;
      expect(payload.id).toBe(bookingId);
    });

    it("allaqachon bekor qilingan bronni qayta bekor qilib bo'lmaydi -> 400", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(400);
    });
  });
});
