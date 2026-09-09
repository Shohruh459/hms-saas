import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isRootSuperAdminEmail, normalizeEmail, ROOT_SUPER_ADMIN_EMAIL } from '../../common/constants/superadmin';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Superadmin panelidan foydalanish huquqini boshqaradi: ROOT_SUPER_ADMIN_EMAIL
 * doim ruxsatga ega, boshqa pochtalar esa faqat AllowedSuperadminEmail
 * jadvaliga qo'shilgan bo'lsa ruxsatga ega bo'ladi (Foydalanuvchining
 * `role` maydoni bu yerda hal qiluvchi emas — haqiqiy huquq shu ro'yxat
 * orqali tekshiriladi).
 */
@Injectable()
export class SuperadminAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isRoot(email: string): boolean {
    return isRootSuperAdminEmail(email);
  }

  async isAllowed(email: string): Promise<boolean> {
    if (this.isRoot(email)) {
      return true;
    }
    const found = await this.prisma.allowedSuperadminEmail.findUnique({
      where: { email: normalizeEmail(email) },
    });
    return Boolean(found);
  }

  async list() {
    const allowed = await this.prisma.allowedSuperadminEmail.findMany({ orderBy: { createdAt: 'desc' } });
    return [{ email: ROOT_SUPER_ADMIN_EMAIL, grantedBy: null, createdAt: null, isRoot: true }, ...allowed.map((entry) => ({ ...entry, isRoot: false }))];
  }

  async grant(email: string, grantedBy: string) {
    const normalized = normalizeEmail(email);
    if (this.isRoot(normalized)) {
      throw new BadRequestException("Root pochta allaqachon to'liq huquqga ega");
    }
    return this.prisma.allowedSuperadminEmail.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized, grantedBy: normalizeEmail(grantedBy) },
    });
  }

  async revoke(email: string) {
    const normalized = normalizeEmail(email);
    if (this.isRoot(normalized)) {
      throw new BadRequestException("Root pochtadan ruxsatni bekor qilib bo'lmaydi");
    }
    try {
      await this.prisma.allowedSuperadminEmail.delete({ where: { email: normalized } });
    } catch {
      throw new NotFoundException("Ushbu pochtaga ruxsat topilmadi");
    }
    return { success: true };
  }
}
