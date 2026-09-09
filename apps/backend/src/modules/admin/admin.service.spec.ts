import { NotFoundException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminService', () => {
  let prisma: { tenant: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      tenant: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    service = new AdminService(prisma as unknown as PrismaService);
  });

  it('findAllTenants barcha tenantlarni qaytaradi', async () => {
    prisma.tenant.findMany.mockResolvedValue([{ id: 't1' }]);
    const result = await service.findAllTenants();
    expect(result).toEqual([{ id: 't1' }]);
  });

  it("mavjud bo'lmagan tenant uchun updateStatus NotFoundException tashlaydi", async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(service.updateStatus('missing', TenantStatus.ACTIVE)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateStatus tenant statusini yangilaydi', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 't1', status: TenantStatus.PENDING });
    prisma.tenant.update.mockResolvedValue({ id: 't1', status: TenantStatus.ACTIVE });

    const result = await service.updateStatus('t1', TenantStatus.ACTIVE);

    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { status: TenantStatus.ACTIVE } });
    expect(result.status).toBe(TenantStatus.ACTIVE);
  });

  it("extendSubscription muddati o'tmagan bo'lsa mavjud sanadan +30 kun qo'shadi", async () => {
    const currentEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    prisma.tenant.findUnique.mockResolvedValue({ id: 't1', subscriptionEndsAt: currentEnd });
    prisma.tenant.update.mockImplementation(({ data }) => Promise.resolve({ id: 't1', ...data }));

    const result = await service.extendSubscription('t1');

    const expected = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(result.subscriptionEndsAt!.getTime()).toBe(expected.getTime());
  });

  it("extendSubscription muddati o'tgan/bo'lmagan bo'lsa hozirdan +30 kun qo'shadi", async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 't1', subscriptionEndsAt: null });
    prisma.tenant.update.mockImplementation(({ data }) => Promise.resolve({ id: 't1', ...data }));

    const before = Date.now();
    const result = await service.extendSubscription('t1');
    const after = Date.now();

    const diffDays = (result.subscriptionEndsAt!.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThanOrEqual(29.99);
    expect(result.subscriptionEndsAt!.getTime()).toBeLessThanOrEqual(after + 30 * 24 * 60 * 60 * 1000);
  });

  it('approveVideo videoApproved=true qiladi', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 't1' });
    prisma.tenant.update.mockResolvedValue({ id: 't1', videoApproved: true });

    const result = await service.approveVideo('t1');

    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { videoApproved: true } });
    expect(result.videoApproved).toBe(true);
  });

  it('rejectVideo videoApproved=false qiladi', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 't1' });
    prisma.tenant.update.mockResolvedValue({ id: 't1', videoApproved: false });

    const result = await service.rejectVideo('t1');

    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { videoApproved: false } });
    expect(result.videoApproved).toBe(false);
  });
});
