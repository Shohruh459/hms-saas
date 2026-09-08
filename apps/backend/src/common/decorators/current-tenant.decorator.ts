import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Joriy so'rov uchun tenantId'ni qaytaradi: avval JWT bilan autentifikatsiya
 * qilingan foydalanuvchining tenantId'i, bo'lmasa TenantMiddleware o'qigan
 * `x-tenant-id` header qiymati.
 */
export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | null => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.tenantId ?? request.tenantId ?? null;
});
