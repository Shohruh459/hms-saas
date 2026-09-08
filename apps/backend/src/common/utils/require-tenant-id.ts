import { BadRequestException } from '@nestjs/common';

/**
 * Tenant-scoped so'rovlar uchun tenantId majburiy. SUPER_ADMIN
 * `x-tenant-id` header orqali tenant kontekstini bermasa, aniq xato
 * qaytariladi (jimgina noto'g'ri/bo'sh natija emas).
 */
export function requireTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) {
    throw new BadRequestException('Tenant konteksti aniqlanmadi (x-tenant-id header talab qilinadi)');
  }
  return tenantId;
}
