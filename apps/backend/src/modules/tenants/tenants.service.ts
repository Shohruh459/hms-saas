import { Injectable, NotFoundException } from '@nestjs/common';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantPaymentKeys } from '../payments/types/tenant-payment-keys.interface';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(tenantId: string | null) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: requireTenantId(tenantId) } });
    if (!tenant) {
      throw new NotFoundException('Mehmonxona topilmadi');
    }

    const paymentKeys = (tenant.paymentKeys as TenantPaymentKeys | null) ?? {};

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      locale: tenant.locale,
      address: tenant.address,
      phone: tenant.phone,
      latitude: tenant.latitude,
      longitude: tenant.longitude,
      // Faqat ommaviy (secret bo'lmagan) to'lov identifikatorlari chiqariladi.
      payments: {
        click: paymentKeys.click ? { merchantId: paymentKeys.click.merchantId, serviceId: paymentKeys.click.serviceId } : null,
        payme: paymentKeys.payme ? { merchantId: paymentKeys.payme.merchantId } : null,
        stripe: paymentKeys.stripe ? { enabled: true } : null,
      },
    };
  }
}
