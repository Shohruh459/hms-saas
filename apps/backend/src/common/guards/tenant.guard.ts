import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Tenant-scoped (mehmonxonaga tegishli) endpoint'lar uchun: so'rovda
 * tenant konteksti (JWT yoki x-tenant-id header) mavjudligini talab qiladi.
 * SUPER_ADMIN uchun tenantId talab qilinmaydi.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId ?? request.tenantId ?? null;

    if (request.user?.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!tenantId) {
      throw new ForbiddenException('Tenant konteksti aniqlanmadi');
    }

    return true;
  }
}
