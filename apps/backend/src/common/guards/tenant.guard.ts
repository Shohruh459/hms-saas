import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertTenantActive } from '../utils/assert-tenant-active';

/**
 * Tenant-scoped (mehmonxonaga tegishli) endpoint'lar uchun: so'rovda
 * tenant konteksti (JWT yoki x-tenant-id header) mavjudligini va tenant
 * ACTIVE holatda (obuna muddati tugamagan) ekanligini talab qiladi.
 * SUPER_ADMIN uchun tenantId/holat tekshiruvi talab qilinmaydi.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId ?? request.tenantId ?? null;

    if (request.user?.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!tenantId) {
      throw new ForbiddenException('Tenant konteksti aniqlanmadi');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true, subscriptionEndsAt: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant konteksti aniqlanmadi');
    }

    assertTenantActive(tenant);

    return true;
  }
}
