import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, TenantStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { assertTenantActive } from '../../common/utils/assert-tenant-active';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service, UploadableFile } from '../uploads/r2.service';
import { TenantPaymentKeys } from '../payments/types/tenant-payment-keys.interface';
import { RegisterHotelDto } from './dto/register-hotel.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly r2Service: R2Service,
  ) {}

  async findPublic(tenantId: string | null) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: requireTenantId(tenantId) } });
    if (!tenant) {
      throw new NotFoundException('Mehmonxona topilmadi');
    }
    assertTenantActive(tenant);

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

  /**
   * Mehmonxonani o'z-o'zidan ro'yxatdan o'tkazish: yangi Tenant (status
   * PENDING — Superadmin tasdiqlashi kerak) va uning HOTEL_OWNER
   * foydalanuvchisi bitta tranzaksiyada yaratiladi.
   */
  async registerHotel(dto: RegisterHotelDto) {
    if (!dto.ownerEmail && !dto.ownerPhone) {
      throw new BadRequestException('ownerEmail yoki ownerPhone kiritilishi shart');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.hotelName,
            subdomain: dto.subdomain,
            region: dto.region,
            address: dto.address,
            latitude: dto.latitude,
            longitude: dto.longitude,
            status: TenantStatus.PENDING,
          },
        });

        return tx.user.create({
          data: {
            tenantId: tenant.id,
            fullName: dto.ownerFullName,
            phone: dto.ownerPhone,
            email: dto.ownerEmail,
            passwordHash,
            role: UserRole.HOTEL_OWNER,
          },
        });
      });

      const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };
      const { passwordHash: _hash, ...safeUser } = user;

      return {
        accessToken: this.jwtService.sign(payload),
        user: safeUser,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException("Ushbu subdomain yoki email/telefon allaqachon ishlatilgan");
      }
      throw error;
    }
  }

  /**
   * HOTEL_OWNER o'z mehmonxonasi uchun bitta qisqa videoni yuklaydi (R2).
   * Har safar yangi video yuklanganda, u qayta ko'rib chiqilguncha
   * `videoApproved` `false`ga qaytariladi.
   */
  async uploadVideo(tenantId: string, file: UploadableFile) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Mehmonxona topilmadi');
    }

    const videoUrl = await this.r2Service.uploadTenantVideo(tenantId, file);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { videoUrl, videoApproved: false },
      select: { id: true, videoUrl: true, videoApproved: true },
    });
  }
}
