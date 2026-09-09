import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  email: string;
  displayName: string;
}

/**
 * GOOGLE_CLIENT_ID/SECRET o'rnatilmagan bo'lsa ham (masalan testlarda)
 * ilova ishga tushishi kerak — shu sababli getOrThrow emas, xavfsiz
 * standart qiymatlar ishlatiladi. Bunday holda /auth/google chaqirilsa,
 * Google'ning o'zi haqiqiy kalitlar yo'qligi sababli xato qaytaradi —
 * bu kutilgan holat, ilova butunlay ishlamay qolmaydi.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? 'not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? 'not-configured',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') ?? 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google profilida email topilmadi'), undefined);
      return;
    }

    const googleProfile: GoogleProfile = { email, displayName: profile.displayName ?? email };
    done(null, googleProfile);
  }
}
