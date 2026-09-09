import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleProfile } from './strategies/google.strategy';
import { AuthService } from './auth.service';

interface GoogleAuthenticatedRequest extends Request {
  user: GoogleProfile;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Yangi foydalanuvchi ro'yxatdan o'tkazish" })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login qilish va JWT access token olish' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Joriy autentifikatsiya qilingan foydalanuvchi ma'lumotlari" })
  me(@CurrentUser() user: unknown) {
    return user;
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Hali amal qiladigan token bilan yangi token olish (sliding session)" })
  refresh(@CurrentUser() user: { id: string }) {
    return this.authService.refresh(user.id);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  googleAuth() {
    // Passport Google strategy shu yerga yetib kelmasdan, foydalanuvchini
    // Google'ning o'z login sahifasiga yo'naltiradi.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: GoogleAuthenticatedRequest, @Res() res: Response) {
    const { accessToken } = await this.authService.loginWithGoogle(req.user);
    const redirectBase = this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URL') ?? 'http://localhost:3000/uz/auth/google/callback';
    res.redirect(`${redirectBase}?token=${encodeURIComponent(accessToken)}`);
  }
}
