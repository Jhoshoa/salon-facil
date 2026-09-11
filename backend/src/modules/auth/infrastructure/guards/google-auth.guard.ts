import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { TokenService } from '../../application/services/token.service';
import { setOAuthNonceCookie } from '../../interface/auth-cookies.util';

// Passes the signed OAuth `state` (carrying `next`/`intent`/`nonce`) through to Google as part
// of the authorize-URL redirect, by overriding what @nestjs/passport hands to
// passport.authenticate(). Also sets the nonce as an httpOnly cookie on this same response —
// that cookie, not the state's signature alone, is what proves the browser hitting
// /auth/google/callback later is the same one that started this flow (see
// AuthController.googleCallback and TokenService.signOAuthState for why this matters:
// otherwise this is vulnerable to OAuth login CSRF). See
// docs/auth-improvement/oauth-redirects-verification.md §2.
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly tokenService: TokenService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const next = typeof req.query.next === 'string' ? req.query.next : undefined;
    const rawIntent = req.query.intent;
    const intent = rawIntent === 'OWNER' || rawIntent === 'CLIENT' ? rawIntent : undefined;

    const nonce = randomBytes(16).toString('hex');
    setOAuthNonceCookie(res, nonce);

    const state = this.tokenService.signOAuthState({ next, intent, nonce });
    return { state };
  }
}
