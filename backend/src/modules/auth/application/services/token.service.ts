import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  jti?: string;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessSecret = this.config.getOrThrow<string>('JWT_SECRET');
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessExpiration = this.config.get<string>('JWT_ACCESS_EXPIRATION', '15m');
    this.refreshExpiration = this.config.get<string>('JWT_REFRESH_EXPIRATION', '7d');
  }

  generateTokens(payload: Omit<TokenPayload, 'type' | 'jti' | 'exp'>): TokenPair {
    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' as const },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiration as unknown as number,
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' as const, jti: randomUUID() },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiration as unknown as number,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationToSeconds(this.accessExpiration),
    };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.accessSecret,
      });
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Token invalido');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Access token invalido o expirado');
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.refreshSecret,
      });
      if (payload.type !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException('Token invalido');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Opaque, single-use token for the password-reset flow — not a JWT, since it carries no
   * claims and is validated by DB lookup (hash) rather than by signature. */
  generatePasswordResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  /** Opaque, single-use code for the email-verification flow — same shape as
   * generatePasswordResetToken, just shorter (this one gets typed by hand into a modal, not
   * clicked from a link) and numeric-only so it's easy to read off an email on a phone. */
  generateEmailVerificationCode(): string {
    // randomInt-style rejection isn't needed at this range: bias from randomBytes(3) mod 1e6 is
    // undetectably small (< 1 part in 16 million) for a 6-digit human-facing code.
    const value = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
    return value.toString().padStart(6, '0');
  }

  /** Signs the OAuth `state` param carrying where to return to (`next`), for a fresh signup
   * which role the entry point intended (`intent`), and a `nonce` — through the redirect to
   * Google and back. Signed (not just base64'd) so the callback can trust it without a DB round
   * trip and so it can't be tampered with to redirect somewhere unintended (open-redirect /
   * role escalation). Short-lived: nobody should be sitting on Google's login screen for more
   * than a few minutes.
   *
   * The `nonce` is the actual CSRF defense, not the signature: a signed-but-unbound state only
   * proves *some* /auth/google request produced it, not that it's the same browser now hitting
   * the callback — without binding it to a value only that browser holds (see the
   * oauth_nonce cookie set alongside this in GoogleAuthGuard), an attacker can start their own
   * OAuth flow, capture the resulting code+state before their browser exchanges it, and hand
   * that URL to a victim — logging the victim into the attacker's account (OAuth login CSRF).
   * See docs/auth-improvement/oauth-redirects-verification.md §2. */
  signOAuthState(payload: { next?: string; intent?: 'CLIENT' | 'OWNER'; nonce: string }): string {
    return this.jwtService.sign(
      { ...payload, type: 'oauth_state' as const },
      { secret: this.accessSecret, expiresIn: '10m' },
    );
  }

  /** Throws (does not degrade to "no state") on a missing/expired/tampered state — unlike a
   * plain redirect hint, the nonce inside is a security boundary, so a state that can't be
   * trusted must block the login rather than silently proceed without it. */
  verifyOAuthState(state: string): { next?: string; intent?: 'CLIENT' | 'OWNER'; nonce: string } {
    const payload = this.jwtService.verify<{
      next?: string;
      intent?: 'CLIENT' | 'OWNER';
      nonce: string;
      type: string;
    }>(state, { secret: this.accessSecret });
    if (payload.type !== 'oauth_state') {
      throw new UnauthorizedException('State invalido');
    }
    return { next: payload.next, intent: payload.intent, nonce: payload.nonce };
  }

  getRefreshTokenExpiresAt(token: string): Date {
    const payload = this.verifyRefreshToken(token);
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }

    return new Date(Date.now() + this.parseExpirationToSeconds(this.refreshExpiration) * 1000);
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([mhd])$/);
    if (!match) return 900;

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 60);
  }
}
