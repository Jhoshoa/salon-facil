import { Response } from 'express';

// Centralizes the cookie attributes for both tokens so login/register/refresh can't
// accidentally set them with slightly different (and therefore inconsistent/insecure) options.
//
// - httpOnly: JS can never read these, in this app or in an attacker's injected script —
//   the whole point of this migration away from localStorage.
// - secure: only sent over HTTPS. Must stay off in dev (plain http://localhost) or the browser
//   silently refuses to store the cookie at all; NODE_ENV=production is expected to be served
//   over HTTPS.
// - sameSite: 'lax' — the CSRF defense here. Cross-site requests (a malicious page on another
//   site) never get the cookie attached except on a top-level GET navigation; since every
//   state-changing endpoint in this API requires POST/PUT/DELETE, a forged cross-site request
//   simply arrives with no session. No separate CSRF token scheme needed on top of this.
// - refresh_token's path is scoped to /api/v1/auth so it's only ever sent to the auth
//   endpoints that actually need it (refresh, logout) — not attached to every single API call
//   the way access_token is, which shrinks its exposure if any endpoint ever leaks headers/cookies
//   in a log or error response.
//
// Same-site requirement for production: the frontend and backend must be served from the same
// registrable domain (e.g. app.salonfacil.bo + api.salonfacil.bo both under salonfacil.bo) for
// sameSite:'lax' cookies to flow between them. If they ever end up on unrelated domains, set
// COOKIE_DOMAIN and revisit this.

const isProduction = () => process.env.NODE_ENV === 'production';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  refreshTokenExpiresAt: Date,
): void {
  const domain = process.env.COOKIE_DOMAIN || undefined;

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    domain,
    path: '/',
    maxAge: tokens.expiresIn * 1000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    domain,
    path: REFRESH_TOKEN_COOKIE_PATH,
    expires: refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  const domain = process.env.COOKIE_DOMAIN || undefined;

  res.clearCookie(ACCESS_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    domain,
    path: '/',
  });
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    domain,
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
}

// Binds a Google OAuth attempt to the browser that started it — the actual CSRF defense for
// that flow (see TokenService.signOAuthState). Scoped to /api/v1/auth/google so it's only ever
// sent to /auth/google (where it's set) and /auth/google/callback (where it's checked), not to
// every request the way access_token is.
export const OAUTH_NONCE_COOKIE = 'oauth_nonce';
const OAUTH_NONCE_COOKIE_PATH = '/api/v1/auth/google';

export function setOAuthNonceCookie(res: Response, nonce: string): void {
  res.cookie(OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: OAUTH_NONCE_COOKIE_PATH,
    maxAge: 10 * 60 * 1000, // matches signOAuthState's 10m expiry
  });
}

export function clearOAuthNonceCookie(res: Response): void {
  res.clearCookie(OAUTH_NONCE_COOKIE, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: OAUTH_NONCE_COOKIE_PATH,
  });
}
