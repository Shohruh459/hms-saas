import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SuperadminAccessService } from '../src/modules/admin/superadmin-access.service';

describe('Superadmin access allowlist (e2e)', () => {
  let app: INestApplication;
  const suffix = Date.now();

  let rootLikeToken: string;
  let strangerToken: string;
  let colleagueToken: string;
  const colleagueEmail = `colleague-${suffix}@test.uz`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const rootEmail = `root-${suffix}@test.uz`;
    const rootRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Allowed Root-like Admin',
      email: rootEmail,
      password: 'RootPass123',
      role: 'SUPER_ADMIN',
    });
    rootLikeToken = rootRes.body.accessToken;
    await app.get(SuperadminAccessService).grant(rootEmail, 'test-setup');

    const strangerRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Self-registered stranger',
      email: `stranger-${suffix}@test.uz`,
      password: 'StrangerPass123',
      role: 'SUPER_ADMIN',
    });
    strangerToken = strangerRes.body.accessToken;

    const colleagueRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Colleague',
      email: colleagueEmail,
      password: 'ColleaguePass123',
      role: 'SUPER_ADMIN',
    });
    colleagueToken = colleagueRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("role=SUPER_ADMIN bo'lsa ham, ruxsat ro'yxatida bo'lmagan email uchun /admin/tenants 403 qaytaradi", async () => {
    const res = await request(app.getHttpServer()).get('/admin/tenants').set('Authorization', `Bearer ${strangerToken}`);
    expect(res.status).toBe(403);
  });

  it("ruxsat ro'yxatida bo'lmagan email uchun /admin/superadmin-access ham 403 qaytaradi", async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/superadmin-access')
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(res.status).toBe(403);
  });

  it("ruxsat berilgan admin /admin/superadmin-access ro'yxatini ko'ra oladi va root email unda isRoot:true bilan bor", async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/superadmin-access')
      .set('Authorization', `Bearer ${rootLikeToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual(expect.objectContaining({ email: 'shohruhluqmonov13@gmail.com', isRoot: true }));
  });

  it('ruxsat berilgan admin yangi hamkasbga ruxsat bera oladi (grant)', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/superadmin-access')
      .set('Authorization', `Bearer ${rootLikeToken}`)
      .send({ email: colleagueEmail });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(colleagueEmail.toLowerCase());
  });

  it('endi shu hamkasb /admin/tenants ni ko\'ra oladi', async () => {
    const res = await request(app.getHttpServer()).get('/admin/tenants').set('Authorization', `Bearer ${colleagueToken}`);
    expect(res.status).toBe(200);
  });

  it("root emailga grant qilishga urinish 400 qaytaradi", async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/superadmin-access')
      .set('Authorization', `Bearer ${rootLikeToken}`)
      .send({ email: 'shohruhluqmonov13@gmail.com' });
    expect(res.status).toBe(400);
  });

  it('ruxsatni bekor qilish (revoke) ishlaydi va keyin kirish qayta 403 bo\'ladi', async () => {
    const revokeRes = await request(app.getHttpServer())
      .delete(`/admin/superadmin-access/${colleagueEmail}`)
      .set('Authorization', `Bearer ${rootLikeToken}`);
    expect(revokeRes.status).toBe(200);

    const afterRevoke = await request(app.getHttpServer())
      .get('/admin/tenants')
      .set('Authorization', `Bearer ${colleagueToken}`);
    expect(afterRevoke.status).toBe(403);
  });

  it("mavjud bo'lmagan pochtani revoke qilish 404 qaytaradi", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/admin/superadmin-access/never-granted-${suffix}@test.uz`)
      .set('Authorization', `Bearer ${rootLikeToken}`);
    expect(res.status).toBe(404);
  });
});
