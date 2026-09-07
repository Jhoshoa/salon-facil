import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { TokenService } from '../../application/services/token.service';

// Passes the signed OAuth `state` (carrying `next`/`intent`) through to Google as part of the
// authorize-URL redirect, by overriding what @nestjs/passport hands to passport.authenticate().
// See docs/auth-improvement/oauth-redirects-verification.md §2.
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly tokenService: TokenService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const next = typeof req.query.next === 'string' ? req.query.next : undefined;
    const rawIntent = req.query.intent;
    const intent = rawIntent === 'OWNER' || rawIntent === 'CLIENT' ? rawIntent : undefined;

    const state = this.tokenService.signOAuthState({ next, intent });
    return { state };
  }
}
