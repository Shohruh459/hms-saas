import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantAId: string;
  let tenantBId: string;
  let ownerAToken: string;
  let ownerBToken: string;
  let housekeeperAToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const suffix = Date.now();

    const tenantA = await prisma.tenant.create({ data: { name: 'Analytics Hotel A', subdomain: `analytics-a-${suffix}` } });
    const tenantB = await prisma.tenant.create({ data: { name: 'Analytics Hotel B', subdomain: `analytics-b-${suffix}` } });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const ownerARes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Owner A',
      email: `analytics-owner-a-${suffix}@test.uz`,
      password: 'OwnerPass123',
      role: 'HOTEL_OWNER',
      tenantId: tenantAId,
    });
    ownerAToken = ownerARes.body.accessToken;

    const ownerBRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Owner B',
      email: `analytics-owner-b-${suffix}@test.uz`,
      password: 'OwnerPass123',
      role: 'HOTEL_OWNER',
      tenantId: tenantBId,
    });
    ownerBToken = ownerBRes.body.accessToken;

    const housekeeperARes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Housekeeper A',
      email: `analytics-hk-a-${suffix}@test.uz`,
      password: 'HkPass123',
      role: 'HOUSEKEEPER',
      tenantId: tenantAId,
    });
    housekeeperAToken = housekeeperARes.body.accessToken;

    const superAdminEmail = `analytics-sa-${suffix}@test.uz`;
    const superAdminRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Analytics Superadmin',
      email: superAdminEmail,
      password: 'SuperPass123',
      role: 'SUPER_ADMIN',
    });
    superAdminToken = superAdminRes.body.accessToken;

    const guestA = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        fullName: 'Guest A',
        email: `analytics-guest-a-${suffix}@test.uz`,
        passwordHash: 'unused',
        role: 'GUEST',
      },
    });

    const roomA = await prisma.room.create({
      data: {
        tenantId: tenantAId,
        roomNumber: 'A-101',
        floor: 1,
        category: 'Standard',
        pricePerNight: 150000,
        type: 'PRIVATE',
        totalBeds: 1,
      },
    });

    // Tenant A uchun yagona, izchil bron: 2026-02-10 -> 2026-02-11 (1 tun), 150000 so'm.
    await prisma.booking.create({
      data: {
        tenantId: tenantAId,
        roomId: roomA.id,
        guestId: guestA.id,
        checkIn: new Date('2026-02-10T00:00:00.000Z'),
        checkOut: new Date('2026-02-11T00:00:00.000Z'),
        totalPrice: 150000,
        bedsBooked: 1,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('token bo\'lmasa -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/analytics/overview');
    expect(res.status).toBe(401);
  });

  it('HOUSEKEEPER analitikaga kira olmaydi -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${housekeeperAToken}`);
    expect(res.status).toBe(403);
  });

  it('HOTEL_OWNER o\'z tenant\'idagi bronni ko\'radi, metrikalar to\'g\'ri hisoblanadi', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .query({ startDate: '2026-02-01', endDate: '2026-02-28' })
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis.totalRevenue).toBe(150000);
    expect(res.body.kpis.totalBookings).toBe(1);
    expect(res.body.kpis.adr).toBe(150000);
    expect(res.body.kpis.occupancyRate).toBeCloseTo((1 / 28) * 100, 1);
    expect(res.body.roomTypeBreakdown).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'PRIVATE', revenue: 150000, share: 100 })]),
    );
    expect(res.body.topRooms[0]).toMatchObject({ roomNumber: 'A-101', revenue: 150000, bookings: 1 });
  });

  it("HOTEL_OWNER boshqa tenant'ning bronini ko'ra olmaydi (tenant isolation)", async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .query({ startDate: '2026-02-01', endDate: '2026-02-28' })
      .set('Authorization', `Bearer ${ownerBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis.totalRevenue).toBe(0);
    expect(res.body.kpis.totalBookings).toBe(0);
    expect(res.body.topRooms).toEqual([]);
  });

  it("SUPER_ADMIN x-tenant-id header orqali istalgan tenant analitikasini ko'radi", async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .query({ startDate: '2026-02-01', endDate: '2026-02-28' })
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.kpis.totalRevenue).toBe(150000);
  });

  it("SUPER_ADMIN x-tenant-id headersiz -> 400 (tenant konteksti aniqlanmadi)", async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(400);
  });

  it("bron sanadan tashqarida qolgan davrni so'rasa -> bo'sh natija", async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .query({ startDate: '2026-05-01', endDate: '2026-05-31' })
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis.totalRevenue).toBe(0);
    expect(res.body.kpis.totalBookings).toBe(0);
  });

  it('startDate endDate dan keyin bo\'lsa -> 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .query({ startDate: '2026-02-28', endDate: '2026-02-01' })
      .set('Authorization', `Bearer ${ownerAToken}`);
    expect(res.status).toBe(400);
  });
});
