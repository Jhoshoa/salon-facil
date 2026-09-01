import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../application/services/auth.service';
import { TokenPayload } from '../../application/services/token.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { ACCESS_TOKEN_COOKIE } from '../../interface/auth-cookies.util';

// The access token lives only in an httpOnly cookie (never in localStorage/a JS-readable
// response body — see the auth cookie migration), so this reads it from there instead of an
// Authorization header. Swagger's "Authorize" button and any Bearer-header client stopped
// working when this changed; that's intentional — a single auth transport is fewer things to
// keep consistently secure than a header fallback would be.
const cookieExtractor = (req: Request): string | null => {
  return (req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined) ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: TokenPayload): Promise<UserEntity> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('Cuenta inactiva o suspendida');
    }

    return user;
  }
}
