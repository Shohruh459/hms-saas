import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { SuperadminAccessService } from '../admin/superadmin-access.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleProfile } from './strategies/google.strategy';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly superadminAccess: SuperadminAccessService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('email yoki phone kiritilishi shart');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [dto.email ? { email: dto.email } : undefined, dto.phone ? { phone: dto.phone } : undefined].filter(
          (clause): clause is NonNullable<typeof clause> => Boolean(clause),
        ),
      },
    });
    if (existing) {
      throw new ConflictException('Bu email/telefon raqami bilan foydalanuvchi allaqachon mavjud');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role ?? UserRole.GUEST,
        tenantId: dto.tenantId ?? null,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('email yoki phone kiritilishi shart');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [dto.email ? { email: dto.email } : undefined, dto.phone ? { phone: dto.phone } : undefined].filter(
          (clause): clause is NonNullable<typeof clause> => Boolean(clause),
        ),
      },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Email/telefon yoki parol noto'g'ri");
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Sliding-session token yangilash: joriy (hali amal qiladigan) token
   * bilan kelgan foydalanuvchi uchun yangi muddatli token qaytaradi.
   * JwtAuthGuard tokenni allaqachon tasdiqlagan bo'lishi shart.
   */
  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    return this.buildAuthResponse(user);
  }

  /**
   * Google orqali kirish: mavjud foydalanuvchi topilsa unga kiriladi,
   * bo'lmasa yangi hisob yaratiladi. Pochta superadmin ruxsat ro'yxatida
   * (yoki root) bo'lsa, rol avtomatik SUPER_ADMIN'ga ko'tariladi — bu
   * superadmin bo'lishning yagona ishonchli yo'li (parol orqali
   * ro'yxatdan o'tishda tanlangan rol emas).
   */
  async loginWithGoogle(profile: GoogleProfile) {
    const isSuperadminEligible = await this.superadminAccess.isAllowed(profile.email);

    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          fullName: profile.displayName,
          email: profile.email,
          passwordHash: await bcrypt.hash(randomUUID(), SALT_ROUNDS),
          role: isSuperadminEligible ? UserRole.SUPER_ADMIN : UserRole.GUEST,
        },
      });
    } else if (isSuperadminEligible && user.role !== UserRole.SUPER_ADMIN) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { role: UserRole.SUPER_ADMIN } });
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };
    const { passwordHash, ...safeUser } = user;

    return {
      accessToken: this.jwtService.sign(payload),
      user: safeUser,
    };
  }
}
