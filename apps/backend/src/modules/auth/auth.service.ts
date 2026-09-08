import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };
    const { passwordHash, ...safeUser } = user;

    return {
      accessToken: this.jwtService.sign(payload),
      user: safeUser,
    };
  }
}
