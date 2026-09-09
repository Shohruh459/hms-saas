import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SUBSCRIPTION_EXTENSION_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  findAllTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        subdomain: true,
        region: true,
        status: true,
        subscriptionEndsAt: true,
        videoUrl: true,
        videoApproved: true,
        createdAt: true,
      },
    });
  }

  async updateStatus(tenantId: string, status: TenantStatus) {
    await this.requireTenant(tenantId);
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { status } });
  }

  async extendSubscription(tenantId: string) {
    const tenant = await this.requireTenant(tenantId);
    const base = tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > new Date() ? tenant.subscriptionEndsAt : new Date();
    const subscriptionEndsAt = new Date(base.getTime() + SUBSCRIPTION_EXTENSION_DAYS * DAY_IN_MS);

    return this.prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionEndsAt } });
  }

  async approveVideo(tenantId: string) {
    await this.requireTenant(tenantId);
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { videoApproved: true } });
  }

  async rejectVideo(tenantId: string) {
    await this.requireTenant(tenantId);
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { videoApproved: false } });
  }

  private async requireTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Mehmonxona topilmadi');
    }
    return tenant;
  }
}
