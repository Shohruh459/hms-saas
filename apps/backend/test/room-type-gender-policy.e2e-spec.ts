import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Private vs Shared xonalar & Gender Policy (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let maleGuestToken: string;
  let maleGuest2Token: string;
  let femaleGuestToken: string;

  let privateRoomId: string;
  let sharedMixedRoomId: string;
  let sharedMaleOnlyRoomId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const tenant = await prisma.tenant.create({
      data: { name: 'Gender Policy Hotel', subdomain: `gender-policy-${Date.now()}` },
    });
    const suffix = Date.now();

    const ownerRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Hotel Owner',
      email: `gp-owner-${suffix}@test.uz`,
      password: 'OwnerPass123',
      role: 'HOTEL_OWNER',
      tenantId: tenant.id,
    });
    ownerToken = ownerRes.body.accessToken;

    const maleRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Male Guest',
      email: `gp-male-${suffix}@test.uz`,
      password: 'GuestPass123',
      role: 'GUEST',
      tenantId: tenant.id,
    });
    maleGuestToken = maleRes.body.accessToken;

    const male2Res = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Male Guest 2',
      email: `gp-male2-${suffix}@test.uz`,
      password: 'GuestPass123',
      role: 'GUEST',
      tenantId: tenant.id,
    });
    maleGuest2Token = male2Res.body.accessToken;

    const femaleRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Female Guest',
      email: `gp-female-${suffix}@test.uz`,
      password: 'GuestPass123',
      role: 'GUEST',
      tenantId: tenant.id,
    });
    femaleGuestToken = femaleRes.body.accessToken;

    const privateRoomRes = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roomNumber: 'P-1', floor: 1, category: 'Standard', pricePerNight: 200000, type: 'PRIVATE' });
    privateRoomId = privateRoomRes.body.id;

    const sharedMixedRes = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        roomNumber: 'S-1',
        floor: 1,
        category: 'Hostel',
        pricePerNight: 150000,
        type: 'SHARED',
        genderPolicy: 'MIXED',
        totalBeds: 3,
        pricePerBed: 50000,
      });
    sharedMixedRoomId = sharedMixedRes.body.id;

    const sharedMaleOnlyRes = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        roomNumber: 'S-2',
        floor: 1,
        category: 'Hostel',
        pricePerNight: 150000,
        type: 'SHARED',
        genderPolicy: 'MALE_ONLY',
        totalBeds: 2,
        pricePerBed: 40000,
      });
    sharedMaleOnlyRoomId = sharedMaleOnlyRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PRIVATE xona — eski mantiq saqlanadi', () => {
    it('1-mehmon bron qilsa butun xona yopiladi, 2-mehmon xuddi shu sanaga bron qila olmaydi -> 409', async () => {
      const first = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${maleGuestToken}`)
        .send({ roomId: privateRoomId, checkIn: '2026-11-01', checkOut: '2026-11-03' });
      expect(first.status).toBe(201);

      const second = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${femaleGuestToken}`)
        .send({ roomId: privateRoomId, checkIn: '2026-11-02', checkOut: '2026-11-04' });
      expect(second.status).toBe(409);
    });
  });

  describe('SHARED xona — koyka asosida bron', () => {
    it('guestGender ko\'rsatilmasa -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${maleGuestToken}`)
        .send({ roomId: sharedMixedRoomId, checkIn: '2026-11-10', checkOut: '2026-11-12', bedsBooked: 1 });
      expect(res.status).toBe(400);
    });

    it("bir necha mehmon turli koykalarni bron qiladi, narx pricePerBed*bedsBooked*kecha bo'yicha hisoblanadi", async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${maleGuestToken}`)
        .send({
          roomId: sharedMixedRoomId,
          checkIn: '2026-11-10',
          checkOut: '2026-11-12',
          guestGender: 'MALE',
          bedsBooked: 2,
        });
      expect(res.status).toBe(201);
      expect(Number(res.body.totalPrice)).toBe(2 * 50000 * 2); // 2 kecha * 50000 * 2 koyka
      expect(res.body.bedsBooked).toBe(2);
    });

    it("koykalar yig'indisi totalBeds dan oshsa -> 409 'Xonada yetarli bo'sh krovat yo'q'", async () => {
      // sharedMixedRoomId: totalBeds=3, allaqachon 2 ta band (yuqoridagi test), endi yana 2 ta so'ralsa -> 4 > 3
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${femaleGuestToken}`)
        .send({
          roomId: sharedMixedRoomId,
          checkIn: '2026-11-11',
          checkOut: '2026-11-13',
          guestGender: 'MALE',
          bedsBooked: 2,
        });
      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Xonada yetarli bo'sh krovat yo'q");
    });

    it('MIXED xonada allaqachon MALE mehmon bor bo\'lsa, ustma-ust sanaga FEMALE bron qila olmaydi -> 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${femaleGuestToken}`)
        .send({
          roomId: sharedMixedRoomId,
          checkIn: '2026-11-11',
          checkOut: '2026-11-13',
          guestGender: 'FEMALE',
          bedsBooked: 1,
        });
      expect(res.status).toBe(409);
    });

    it('MALE_ONLY xonaga FEMALE mehmon bron qila olmaydi -> 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${femaleGuestToken}`)
        .send({ roomId: sharedMaleOnlyRoomId, checkIn: '2026-12-01', checkOut: '2026-12-03', guestGender: 'FEMALE', bedsBooked: 1 });
      expect(res.status).toBe(409);
    });

    it('MALE_ONLY xonaga MALE mehmon(lar) muvaffaqiyatli bron qiladi', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${maleGuest2Token}`)
        .send({ roomId: sharedMaleOnlyRoomId, checkIn: '2026-12-01', checkOut: '2026-12-03', guestGender: 'MALE', bedsBooked: 1 });
      expect(res.status).toBe(201);
    });
  });
});
