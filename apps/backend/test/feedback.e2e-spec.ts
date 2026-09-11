import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AiFeedbackService } from '../src/modules/feedback/ai-feedback.service';
import { SuperadminAccessService } from '../src/modules/admin/superadmin-access.service';

describe('AI Feedback module (e2e)', () => {
  let app: INestApplication;
  const suffix = Date.now();
  const mockAiFeedbackService = { analyze: jest.fn() };

  let tenantId: string;
  let strangerToken: string;
  let superAdminToken: string;
  let feedbackId: string;

  const guestPhone = `+99890${suffix}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiFeedbackService)
      .useValue(mockAiFeedbackService)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const hotelRes = await request(app.getHttpServer()).post('/tenants/register').send({
      hotelName: 'Feedback Test Hotel',
      subdomain: `feedback-hotel-${suffix}`,
      ownerFullName: 'Feedback Owner',
      ownerEmail: `feedback-owner-${suffix}@test.uz`,
      password: 'OwnerPass123',
    });
    tenantId = hotelRes.body.user.tenantId;

    const superAdminEmail = `feedback-sa-${suffix}@test.uz`;
    const superAdminRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Feedback Superadmin',
      email: superAdminEmail,
      password: 'SuperPass123',
      role: 'SUPER_ADMIN',
    });
    superAdminToken = superAdminRes.body.accessToken;
    await app.get(SuperadminAccessService).grant(superAdminEmail, 'test-setup');

    const strangerRes = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Stranger Admin',
      email: `feedback-stranger-${suffix}@test.uz`,
      password: 'StrangerPass123',
      role: 'SUPER_ADMIN',
    });
    strangerToken = strangerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /feedback/ai-chat -> AI javobi bilan 201 qaytaradi va bazaga saqlaydi', async () => {
    mockAiFeedbackService.analyze.mockResolvedValue({
      reply: "Kechirasiz, texnik xizmatchi tez orada xonangizga yetib boradi.",
      summary: 'Konditsioner ishlamayapti',
      category: 'COMPLAINT',
    });

    const res = await request(app.getHttpServer())
      .post('/feedback/ai-chat')
      .set('x-tenant-id', tenantId)
      .send({ message: 'Xonamda konditsioner ishlamayapti', roomNumber: '204', guestPhone, guestName: 'Aziz' });

    expect(res.status).toBe(201);
    expect(res.body.aiReply).toBe("Kechirasiz, texnik xizmatchi tez orada xonangizga yetib boradi.");
    expect(res.body.aiSummary).toBe('Konditsioner ishlamayapti');
    expect(res.body.category).toBe('COMPLAINT');
    expect(res.body.status).toBe('PENDING');
    feedbackId = res.body.id;
    expect(mockAiFeedbackService.analyze).toHaveBeenCalledWith('Xonamda konditsioner ishlamayapti');
  });

  it('x-tenant-id headersiz 400 qaytaradi', async () => {
    const res = await request(app.getHttpServer()).post('/feedback/ai-chat').send({ message: 'Salom' });
    expect(res.status).toBe(400);
  });

  it("GET /feedback/my-tickets telefon bo'yicha murojaatni qaytaradi, adminReply hali yo'q", async () => {
    const res = await request(app.getHttpServer())
      .get('/feedback/my-tickets')
      .set('x-tenant-id', tenantId)
      .query({ phone: guestPhone });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(feedbackId);
    expect(res.body[0].adminReply).toBeNull();
    expect(res.body[0].status).toBe('PENDING');
  });

  it("ruxsat berilmagan SUPER_ADMIN uchun /admin/feedbacks 403 qaytaradi", async () => {
    const res = await request(app.getHttpServer()).get('/admin/feedbacks').set('Authorization', `Bearer ${strangerToken}`);
    expect(res.status).toBe(403);
  });

  it("ruxsat berilgan Superadmin barcha mehmonxonalardan murojaatlarni ko'radi (mehmonxona nomi bilan)", async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/feedbacks')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    const found = res.body.find((item: { id: string }) => item.id === feedbackId);
    expect(found).toBeDefined();
    expect(found.roomNumber).toBe('204');
    expect(found.guestPhone).toBe(guestPhone);
    expect(found.tenant.name).toBe('Feedback Test Hotel');
  });

  it('POST /admin/feedbacks/:id/reply javobni saqlaydi va RESOLVED qiladi', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/feedbacks/${feedbackId}/reply`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reply: 'Muammo hal qilindi, konditsioner almashtirildi.' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('RESOLVED');
    expect(res.body.adminReply).toBe('Muammo hal qilindi, konditsioner almashtirildi.');
    expect(res.body.repliedBy).toContain('feedback-sa-');
    // Reply javobi ham tenant relatsiyasini o'z ichiga olishi kerak — frontend
    // superadmin jadvali shuni kutadi (aks holda `tenant.name` undefined bo'lib qoladi).
    expect(res.body.tenant.name).toBe('Feedback Test Hotel');
  });

  it("javobdan keyin GET /feedback/my-tickets adminReply va RESOLVED statusni ko'rsatadi", async () => {
    const res = await request(app.getHttpServer())
      .get('/feedback/my-tickets')
      .set('x-tenant-id', tenantId)
      .query({ phone: guestPhone });

    expect(res.status).toBe(200);
    expect(res.body[0].status).toBe('RESOLVED');
    expect(res.body[0].adminReply).toBe('Muammo hal qilindi, konditsioner almashtirildi.');
  });
});
