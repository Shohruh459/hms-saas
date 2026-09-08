import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rooms & ServiceRequests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let tenantId: string;

  let ownerToken: string;
  let housekeeperToken: string;
  let guestToken: string;

  let roomId: string;
  let serviceRequestId: string;

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
      data: { name: 'Test Hotel', subdomain: `test-hotel-${Date.now()}` },
    });
    tenantId = tenant.id;

    const suffix = Date.now();

    const ownerRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Hotel Owner',
      email: `owner-${suffix}@test.uz`,
      password: 'OwnerPass123',
      role: 'HOTEL_OWNER',
      tenantId,
    });
    ownerToken = ownerRes.body.accessToken;

    const housekeeperRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Housekeeper',
      email: `hk-${suffix}@test.uz`,
      password: 'HkPass123',
      role: 'HOUSEKEEPER',
      tenantId,
    });
    housekeeperToken = housekeeperRes.body.accessToken;

    const guestRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Guest',
      email: `guest-${suffix}@test.uz`,
      password: 'GuestPass123',
      role: 'GUEST',
      tenantId,
    });
    guestToken = guestRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Rooms CRUD + RBAC', () => {
    it('GUEST xona yarata olmaydi -> 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ roomNumber: '101', floor: 1, type: 'Standard', pricePerNight: 100000 });
      expect(res.status).toBe(403);
    });

    it('HOTEL_OWNER xona yaratadi -> 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ roomNumber: '101', floor: 1, type: 'Standard', pricePerNight: 100000 });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('AVAILABLE');
      roomId = res.body.id;
    });

    it("tenant ichida takroriy xona raqami -> 409", async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ roomNumber: '101', floor: 1, type: 'Standard', pricePerNight: 100000 });
      expect(res.status).toBe(409);
    });

    it("GET /rooms tenant xonalarini qaytaradi", async () => {
      const res = await request(app.getHttpServer()).get('/rooms').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it("HOUSEKEEPER xona statusini o'zgartira oladi -> 200", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/rooms/${roomId}/status`)
        .set('Authorization', `Bearer ${housekeeperToken}`)
        .send({ status: 'CLEANING' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CLEANING');
    });

    it("GUEST xonani o'chira olmaydi -> 403", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/rooms/${roomId}`)
        .set('Authorization', `Bearer ${guestToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("ServiceRequest oqimi va WebSocket bildirishnomalari", () => {
    let ownerSocket: Socket;
    let housekeeperSocket: Socket;
    let guestSocket: Socket;

    const waitForConnect = (socket: Socket) => new Promise<void>((resolve) => socket.once('connect', () => resolve()));
    const waitForEvent = (socket: Socket, event: string) => new Promise<any>((resolve) => socket.once(event, resolve));

    beforeAll(async () => {
      ownerSocket = io(`${baseUrl}/notifications`, { auth: { token: ownerToken }, transports: ['websocket'] });
      housekeeperSocket = io(`${baseUrl}/notifications`, { auth: { token: housekeeperToken }, transports: ['websocket'] });
      guestSocket = io(`${baseUrl}/notifications`, { auth: { token: guestToken }, transports: ['websocket'] });

      await Promise.all([waitForConnect(ownerSocket), waitForConnect(housekeeperSocket), waitForConnect(guestSocket)]);
    });

    afterAll(() => {
      ownerSocket.disconnect();
      housekeeperSocket.disconnect();
      guestSocket.disconnect();
    });

    it("guest so'rov yaratganda admin real-time \"service-request.created\" oladi", async () => {
      const createdEvent = waitForEvent(ownerSocket, 'service-request.created');

      const res = await request(app.getHttpServer())
        .post('/service-requests/guest')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ roomId, reason: 'Sochiq kerak' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING_ADMIN');
      serviceRequestId = res.body.id;

      const payload = await createdEvent;
      expect(payload.id).toBe(serviceRequestId);
      expect(payload.status).toBe('PENDING_ADMIN');
    });

    it("HOUSEKEEPER hali tasdiqlanmagan so'rovni bajara olmaydi -> 400", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/service-requests/${serviceRequestId}/staff-fulfill`)
        .set('Authorization', `Bearer ${housekeeperToken}`)
        .send({ completed: true });
      expect(res.status).toBe(400);
    });

    it("GUEST admin-approve chaqira olmaydi -> 403", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/service-requests/${serviceRequestId}/admin-approve`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ approve: true });
      expect(res.status).toBe(403);
    });

    it("admin tasdiqlaganda housekeeper va guest \"service-request.approved\" oladi", async () => {
      const housekeeperEvent = waitForEvent(housekeeperSocket, 'service-request.approved');
      const guestEvent = waitForEvent(guestSocket, 'service-request.approved');

      const res = await request(app.getHttpServer())
        .patch(`/service-requests/${serviceRequestId}/admin-approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ approve: true, staffNotes: 'Xizmatchiga yuborildi' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED_BY_ADMIN');

      const [housekeeperPayload, guestPayload] = await Promise.all([housekeeperEvent, guestEvent]);
      expect(housekeeperPayload.status).toBe('APPROVED_BY_ADMIN');
      expect(guestPayload.status).toBe('APPROVED_BY_ADMIN');
    });

    it("housekeeper bajarganda guest va admin \"service-request.completed\" oladi", async () => {
      const guestEvent = waitForEvent(guestSocket, 'service-request.completed');
      const ownerEvent = waitForEvent(ownerSocket, 'service-request.completed');

      const res = await request(app.getHttpServer())
        .patch(`/service-requests/${serviceRequestId}/staff-fulfill`)
        .set('Authorization', `Bearer ${housekeeperToken}`)
        .send({ completed: true, staffNotes: 'Sochiq yetkazildi' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');

      const [guestPayload, ownerPayload] = await Promise.all([guestEvent, ownerEvent]);
      expect(guestPayload.status).toBe('COMPLETED');
      expect(ownerPayload.status).toBe('COMPLETED');
    });
  });
});
