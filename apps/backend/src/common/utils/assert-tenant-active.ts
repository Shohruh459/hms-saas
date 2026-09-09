import { ForbiddenException } from '@nestjs/common';
import { Tenant, TenantStatus } from '@prisma/client';
import { TENANT_INACTIVE_MESSAGE } from '../constants/tenant-messages';

/**
 * Tenant ACTIVE holatda va obuna muddati o'tmaganligini tekshiradi.
 * Aks holda (BLOKLANGAN/PENDING/EXPIRED yoki muddati o'tgan) xizmatni
 * cheklaydigan bir xil xabar bilan ForbiddenException tashlaydi.
 */
export function assertTenantActive(tenant: Pick<Tenant, 'status' | 'subscriptionEndsAt'>): void {
  const isExpired = tenant.subscriptionEndsAt !== null && tenant.subscriptionEndsAt < new Date();

  if (tenant.status !== TenantStatus.ACTIVE || isExpired) {
    throw new ForbiddenException(TENANT_INACTIVE_MESSAGE);
  }
}
