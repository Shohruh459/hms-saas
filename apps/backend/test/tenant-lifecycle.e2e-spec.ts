import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SuperadminAccessService } from '../src/modules/admin/superadmin-access.service';
import { R2Service } from '../src/modules/uploads/r2.service';

describe('Tenant lifecycle: registration, status enforcement, R2 video, superadmin, discovery (e2e)', () => {
  let app: INestApplication;
  const suffix = Date.now();
  const mockR2Service = { uploadTenantVideo: jest.fn() };

  let tenantId: string;
  let ownerToken: string;
  let superAdminToken: string;

  const subdomain = `e2e-hotel-${suffix}`;
  const contactMessage = "Obunani uzaytirish uchun +998933169713 raqamiga bog'laning";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(R2Service)
      .useValue(mockR2Service)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const superAdminEmail = `superadmin-${suffix}@test.uz`;
    const superAdminRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Super Admin',
      email: superAdminEmail,
      password: 'SuperPass123',
      role: 'SUPER_ADMIN',
    });
    superAdminToken = superAdminRes.body.accessToken;

    // Superadmin panel/endpoint'lariga kirish endi faqat ruxsat ro'yxatidagi
    // pochtalarga berilgani uchun, testda ham shu email avval ro'yxatga
    // qo'shiladi (real hayotda buni root pochta bajaradi).
    await app.get(SuperadminAccessService).grant(superAdminEmail, 'test-setup');
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /tenants/register -> 201, yangi mehmonxona PENDING holatda yaratiladi", async () => {
    const res = await request(app.getHttpServer()).post('/tenants/register').send({
      hotelName: 'E2E Test Hotel',
      subdomain,
      region: 'Samarqand',
      ownerFullName: 'Aziz Karimov',
      ownerEmail: `owner-${suffix}@test.uz`,
      password: 'OwnerPass123',
    });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('HOTEL_OWNER');
    ownerToken = res.body.accessToken;
    tenantId = res.body.user.tenantId;
    expect(tenantId).toBeTruthy();
  });

  it("PENDING mehmonxona uchun GET /tenants/public bog'lanish xabari bilan 403 qaytaradi", async () => {
    const res = await request(app.getHttpServer()).get('/tenants/public').set('x-tenant-id', tenantId);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(contactMessage);
  });

  it('PENDING mehmonxona uchun GET /rooms/public bir xil xabar bilan 403 qaytaradi', async () => {
    const res = await request(app.getHttpServer()).get('/rooms/public').set('x-tenant-id', tenantId);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(contactMessage);
  });

  it('HOTEL_OWNER (tenant scoped) uchun ham TenantGuard bloklaydi -> GET /rooms 403', async () => {
    const res = await request(app.getHttpServer()).get('/rooms').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(contactMessage);
  });

  it('SUPER_ADMIN bo\'lmagan foydalanuvchi /admin/tenants ni ko\'ra olmaydi -> 403', async () => {
    const res = await request(app.getHttpServer()).get('/admin/tenants').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN GET /admin/tenants -> ro\'yxatda yangi (PENDING) mehmonxona bor', async () => {
    const res = await request(app.getHttpServer()).get('/admin/tenants').set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    const created = res.body.find((t: { id: string }) => t.id === tenantId);
    expect(created).toBeDefined();
    expect(created.status).toBe('PENDING');
  });

  it('SUPER_ADMIN mehmonxonani ACTIVE qiladi -> keyin ochiq API ishlaydi', async () => {
    const patchRes = await request(app.getHttpServer())
      .patch(`/admin/tenants/${tenantId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'ACTIVE' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe('ACTIVE');

    const publicRes = await request(app.getHttpServer()).get('/tenants/public').set('x-tenant-id', tenantId);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.id).toBe(tenantId);
  });

  it('SUPER_ADMIN obunani 30 kunga uzaytiradi', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/tenants/${tenantId}/extend-subscription`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    const endsAt = new Date(res.body.subscriptionEndsAt).getTime();
    const expectedMin = Date.now() + 29 * 24 * 60 * 60 * 1000;
    const expectedMax = Date.now() + 31 * 24 * 60 * 60 * 1000;
    expect(endsAt).toBeGreaterThan(expectedMin);
    expect(endsAt).toBeLessThan(expectedMax);
  });

  it("HOTEL_OWNER video yuklaydi (R2 mock) -> videoUrl o'rnatiladi, videoApproved false", async () => {
    mockR2Service.uploadTenantVideo.mockResolvedValue(`https://videos.example.com/tenant-videos/${tenantId}/tour.mp4`);

    const res = await request(app.getHttpServer())
      .post('/tenants/video')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('video', Buffer.from('fake-video-bytes'), 'tour.mp4');

    expect(res.status).toBe(201);
    expect(res.body.videoUrl).toContain('tour.mp4');
    expect(res.body.videoApproved).toBe(false);
    expect(mockR2Service.uploadTenantVideo).toHaveBeenCalledWith(tenantId, expect.objectContaining({ mimetype: 'video/mp4' }));
  });

  it('videoApproved=false bo\'lganda /discovery/hotels ro\'yxatida ko\'rinmaydi', async () => {
    const res = await request(app.getHttpServer()).get('/discovery/hotels');
    expect(res.status).toBe(200);
    expect(res.body.find((h: { id: string }) => h.id === tenantId)).toBeUndefined();
  });

  it('SUPER_ADMIN videoni tasdiqlaydi -> endi /discovery/hotels ro\'yxatida ko\'rinadi', async () => {
    const approveRes = await request(app.getHttpServer())
      .patch(`/admin/tenants/${tenantId}/approve-video`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.videoApproved).toBe(true);

    const discoveryRes = await request(app.getHttpServer()).get('/discovery/hotels').query({ region: 'Samarqand' });
    expect(discoveryRes.status).toBe(200);
    const found = discoveryRes.body.find((h: { id: string }) => h.id === tenantId);
    expect(found).toBeDefined();
    expect(found.region).toBe('Samarqand');
  });

  it("SUPER_ADMIN mehmonxonani bloklaydi -> ochiq API va discovery'dan yo'qoladi", async () => {
    const blockRes = await request(app.getHttpServer())
      .patch(`/admin/tenants/${tenantId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'BLOCKED' });
    expect(blockRes.status).toBe(200);

    const publicRes = await request(app.getHttpServer()).get('/tenants/public').set('x-tenant-id', tenantId);
    expect(publicRes.status).toBe(403);
    expect(publicRes.body.message).toBe(contactMessage);

    const discoveryRes = await request(app.getHttpServer()).get('/discovery/hotels');
    expect(discoveryRes.body.find((h: { id: string }) => h.id === tenantId)).toBeUndefined();
  });
});
