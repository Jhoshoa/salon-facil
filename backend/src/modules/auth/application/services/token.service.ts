import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';

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
