import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SuperadminAccessService } from '../admin/superadmin-access.service';

describe('AuthService.loginWithGoogle', () => {
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock } };
  let jwtService: { sign: jest.Mock };
  let superadminAccess: { isAllowed: jest.Mock };
  let service: AuthService;

  const profile = { email: 'someone@example.com', displayName: 'Someone' };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
    superadminAccess = { isAllowed: jest.fn() };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      superadminAccess as unknown as SuperadminAccessService,
    );
  });

  it("ruxsat ro'yxatida bo'lmagan yangi email uchun GUEST rolida hisob yaratadi", async () => {
    superadminAccess.isAllowed.mockResolvedValue(false);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      email: profile.email,
      fullName: profile.displayName,
      role: UserRole.GUEST,
      tenantId: null,
      passwordHash: 'hash',
    });

    const result = await service.loginWithGoogle(profile);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: UserRole.GUEST, email: profile.email }) }),
    );
    expect(result.accessToken).toBe('signed-jwt');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it("ruxsat ro'yxatidagi yangi email uchun SUPER_ADMIN rolida hisob yaratadi", async () => {
    superadminAccess.isAllowed.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      email: profile.email,
      fullName: profile.displayName,
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      passwordHash: 'hash',
    });

    await service.loginWithGoogle(profile);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: UserRole.SUPER_ADMIN }) }),
    );
  });

  it("mavjud GUEST foydalanuvchi ruxsat ro'yxatiga qo'shilgan bo'lsa SUPER_ADMIN'ga ko'tariladi", async () => {
    superadminAccess.isAllowed.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: profile.email,
      fullName: profile.displayName,
      role: UserRole.GUEST,
      tenantId: null,
      passwordHash: 'hash',
    });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      email: profile.email,
      fullName: profile.displayName,
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      passwordHash: 'hash',
    });

    const result = await service.loginWithGoogle(profile);

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { role: UserRole.SUPER_ADMIN } });
    expect(result.user.role).toBe(UserRole.SUPER_ADMIN);
  });

  it("mavjud SUPER_ADMIN foydalanuvchi uchun qayta yangilanmaydi", async () => {
    superadminAccess.isAllowed.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: profile.email,
      fullName: profile.displayName,
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      passwordHash: 'hash',
    });

    await service.loginWithGoogle(profile);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("ruxsat ro'yxatidan chiqarilgan mavjud foydalanuvchining roli o'zgartirilmaydi", async () => {
    superadminAccess.isAllowed.mockResolvedValue(false);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: profile.email,
      fullName: profile.displayName,
      role: UserRole.HOTEL_OWNER,
      tenantId: 't1',
      passwordHash: 'hash',
    });

    const result = await service.loginWithGoogle(profile);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(result.user.role).toBe(UserRole.HOTEL_OWNER);
  });
});
