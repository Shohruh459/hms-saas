import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication;
  const uniqueEmail = `test-${Date.now()}@example.com`;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> 200 ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'hms-backend' });
  });

  it('POST /auth/register -> 201 va accessToken qaytaradi', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Test Guest',
      email: uniqueEmail,
      password: 'StrongPass123',
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(uniqueEmail);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('POST /auth/register takroriy email -> 409', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Boshqa Odam',
      email: uniqueEmail,
      password: 'AnotherPass123',
    });
    expect(res.status).toBe(409);
  });

  it('POST /auth/login -> 200 va accessToken qaytaradi', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: uniqueEmail,
      password: 'StrongPass123',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it("POST /auth/login noto'g'ri parol -> 401", async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: uniqueEmail,
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me tokensiz -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me token bilan -> 200', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(uniqueEmail);
  });
});
