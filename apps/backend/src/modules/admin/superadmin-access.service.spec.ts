import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SuperadminAccessService } from './superadmin-access.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SuperadminAccessService', () => {
  let prisma: {
    allowedSuperadminEmail: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock; delete: jest.Mock };
  };
  let service: SuperadminAccessService;

  beforeEach(() => {
    prisma = {
      allowedSuperadminEmail: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    };
    service = new SuperadminAccessService(prisma as unknown as PrismaService);
  });

  it('isRoot faqat ROOT_SUPER_ADMIN_EMAIL uchun true qaytaradi (katta-kichik harfga sezuvsiz)', () => {
    expect(service.isRoot('shohruhluqmonov13@gmail.com')).toBe(true);
    expect(service.isRoot('SHOHRUHLUQMONOV13@GMAIL.COM')).toBe(true);
    expect(service.isRoot('someone@else.com')).toBe(false);
  });

  it('isAllowed root email uchun bazaga so\'rov yubormasdan true qaytaradi', async () => {
    const result = await service.isAllowed('shohruhluqmonov13@gmail.com');
    expect(result).toBe(true);
    expect(prisma.allowedSuperadminEmail.findUnique).not.toHaveBeenCalled();
  });

  it('isAllowed ro\'yxatda bo\'lmagan pochta uchun false qaytaradi', async () => {
    prisma.allowedSuperadminEmail.findUnique.mockResolvedValue(null);
    const result = await service.isAllowed('random@example.com');
    expect(result).toBe(false);
  });

  it('isAllowed ro\'yxatdagi pochta uchun true qaytaradi', async () => {
    prisma.allowedSuperadminEmail.findUnique.mockResolvedValue({ email: 'ally@example.com' });
    const result = await service.isAllowed('Ally@example.com');
    expect(result).toBe(true);
    expect(prisma.allowedSuperadminEmail.findUnique).toHaveBeenCalledWith({ where: { email: 'ally@example.com' } });
  });

  it('grant root emailga urinishda BadRequestException tashlaydi', async () => {
    await expect(service.grant('shohruhluqmonov13@gmail.com', 'someone@example.com')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.allowedSuperadminEmail.upsert).not.toHaveBeenCalled();
  });

  it('grant emailni kichik harflarga normallashtirib upsert qiladi', async () => {
    prisma.allowedSuperadminEmail.upsert.mockResolvedValue({ email: 'ally@example.com', grantedBy: 'root@example.com' });

    await service.grant('Ally@Example.com', 'Root@Example.com');

    expect(prisma.allowedSuperadminEmail.upsert).toHaveBeenCalledWith({
      where: { email: 'ally@example.com' },
      update: {},
      create: { email: 'ally@example.com', grantedBy: 'root@example.com' },
    });
  });

  it('revoke root emailga urinishda BadRequestException tashlaydi', async () => {
    await expect(service.revoke('shohruhluqmonov13@gmail.com')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.allowedSuperadminEmail.delete).not.toHaveBeenCalled();
  });

  it("revoke mavjud bo'lmagan pochta uchun NotFoundException tashlaydi", async () => {
    prisma.allowedSuperadminEmail.delete.mockRejectedValue(new Error('not found'));
    await expect(service.revoke('missing@example.com')).rejects.toBeInstanceOf(NotFoundException);
  });

  it("revoke mavjud pochtani muvaffaqiyatli o'chiradi", async () => {
    prisma.allowedSuperadminEmail.delete.mockResolvedValue({ email: 'ally@example.com' });
    const result = await service.revoke('ally@example.com');
    expect(result).toEqual({ success: true });
  });

  it('list root emailni doim birinchi bo\'lib qaytaradi', async () => {
    prisma.allowedSuperadminEmail.findMany.mockResolvedValue([
      { email: 'ally@example.com', grantedBy: 'root', createdAt: new Date() },
    ]);

    const result = await service.list();

    expect(result[0]).toEqual(expect.objectContaining({ email: 'shohruhluqmonov13@gmail.com', isRoot: true }));
    expect(result[1]).toEqual(expect.objectContaining({ email: 'ally@example.com', isRoot: false }));
  });
});
