import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, StrategyOptions, Profile } from 'passport-google-oauth20';
import { GoogleProfile } from '../../application/services/auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    // Google OAuth env vars are optional (see validation.schema.ts) since not every environment
    // has credentials configured yet — falling back to placeholders here lets the app boot
    // normally; hitting /auth/google without real credentials just fails at Google's end
    // instead of crashing Nest's bootstrap.
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') ?? 'not-configured',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') ?? 'not-configured',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    } as StrategyOptions);
  }

  // Passport calls this after Google redirects back with a successful login — `profile` is
  // Google's own user info, already fetched using the code exchanged behind the scenes.
  // Returning a value here is what populates req.user in the callback route.
  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleProfile {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('La cuenta de Google no tiene un email asociado');
    }

    return {
      providerId: profile.id,
      email,
      emailVerified: profile.emails?.[0]?.verified === true,
      fullName: profile.displayName,
    };
  }
}
