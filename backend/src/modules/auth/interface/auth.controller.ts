import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { AuthService, GoogleProfile } from '../application/services/auth.service';
import { RegisterDto } from '../application/dto/register.dto';
import { LoginDto } from '../application/dto/login.dto';
import { UpdateProfileDto } from '../application/dto/update-profile.dto';
import { ForgotPasswordDto } from '../application/dto/forgot-password.dto';
import { ResetPasswordDto } from '../application/dto/reset-password.dto';
import { VerifyEmailDto } from '../application/dto/verify-email.dto';
import { AuthResponseDto, PublicAuthResponseDto } from '../application/dto/auth-response.dto';
import { LogoutDto } from '../application/dto/logout.dto';
import { UserEntity, UserRole } from '../domain/entities/user.entity';
import { TokenService } from '../application/services/token.service';
import { GoogleAuthGuard } from '../infrastructure/guards/google-auth.guard';
import {
  OAUTH_NONCE_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  clearOAuthNonceCookie,
  setAuthCookies,
} from './auth-cookies.util';

const toProfileDto = (user: UserEntity) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  fullName: user.fullName,
  role: user.role,
  status: user.status,
  avatarUrl: user.avatarUrl,
  city: user.city,
  district: user.district,
  whatsappPhone: user.whatsappPhone,
  emailVerified: user.isVerified(),
});

// Same default-landing-page-per-role table the frontend's own post-login redirect uses (see
// login-form.tsx) — kept in sync manually since this is the one redirect that has to happen
// server-side (the OAuth callback can't hand control back to a client-side router first).
const defaultRedirectForRole = (role: string): string => {
  if (role === UserRole.OWNER) return '/dashboard';
  if (role === UserRole.ADMIN) return '/admin';
  return '/bookings';
};

const isSafeNextPath = (next: string | undefined): next is string =>
  !!next && next.startsWith('/') && !next.startsWith('//');

// Strips accessToken/refreshToken before they'd ever reach a JSON response body — they only
// travel via the httpOnly Set-Cookie headers written by setAuthCookies.
const toPublicResponse = (auth: AuthResponseDto): PublicAuthResponseDto => ({
  user: auth.user,
  expiresIn: auth.expiresIn,
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario (CLIENT o OWNER)' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email o teléfono ya registrado' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicAuthResponseDto> {
    const auth = await this.registerUseCase.execute(dto);
    setAuthCookies(res, auth, this.tokenService.getRefreshTokenExpiresAt(auth.refreshToken));
    return toPublicResponse(auth);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicAuthResponseDto> {
    const auth = await this.loginUseCase.execute(dto);
    setAuthCookies(res, auth, this.tokenService.getRefreshTokenExpiresAt(auth.refreshToken));
    return toPublicResponse(auth);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar tokens de acceso usando la cookie de refresh' })
  @ApiResponse({ status: 200, description: 'Tokens refrescados exitosamente' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido, expirado o ausente' })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicAuthResponseDto> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    const auth = await this.refreshTokenUseCase.execute(refreshToken);
    setAuthCookies(res, auth, this.tokenService.getRefreshTokenExpiresAt(auth.refreshToken));
    return toPublicResponse(auth);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión (o todas las sesiones con { allDevices: true })' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    // Always revoke whatever's actually in this browser's own cookie — never a token value the
    // client could claim in the body, which used to be possible when this came from @Body().
    const refreshToken = dto.allDevices
      ? undefined
      : (req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined);
    const result = await this.logoutUseCase.execute(userId, refreshToken);
    clearAuthCookies(res);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar enlace de restablecimiento de contraseña' })
  @ApiResponse({ status: 200, description: 'Enlace enviado si el email existe' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con el token recibido por email' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Datos del usuario actual' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async me(@CurrentUser() user: UserEntity) {
    return toProfileDto(user);
  }

  @Put('me')
  @ApiOperation({ summary: 'Actualizar el perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    const user = await this.authService.updateProfile(userId, dto);
    return toProfileDto(user);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar el email con el codigo de 6 digitos enviado' })
  @ApiResponse({ status: 200, description: 'Email verificado' })
  @ApiResponse({ status: 400, description: 'Codigo invalido, expirado o intentos agotados' })
  async verifyEmail(@CurrentUser('id') userId: string, @Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(userId, dto.code);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar el codigo de verificacion de email' })
  @ApiResponse({ status: 200, description: 'Codigo reenviado (o ya estaba verificado)' })
  @ApiResponse({ status: 400, description: 'Hay que esperar el cooldown antes de reenviar' })
  async resendVerificationCode(@CurrentUser('id') userId: string) {
    return this.authService.resendVerificationCode(userId);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Inicia el flujo de OAuth con Google (redirige a Google)' })
  googleAuth() {
    // Body intentionally empty — GoogleAuthGuard's getAuthenticateOptions builds the signed
    // state and passport.authenticate() performs the redirect before this handler ever runs.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de Google OAuth — redirige de vuelta al frontend' })
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const rawState = typeof req.query.state === 'string' ? req.query.state : '';
    const nonceCookie = req.cookies?.[OAUTH_NONCE_COOKIE] as string | undefined;

    // The state's signature alone only proves it came from this server at some point — it does
    // NOT prove this is the same browser that started the flow. That's what the nonce cookie is
    // for: an attacker can start their own /auth/google, capture the resulting code+state
    // before their browser exchanges it, and hand that URL to a victim; the victim's browser
    // never received the matching oauth_nonce cookie, so this check rejects it. Without this,
    // the victim would get silently logged into the attacker's account (OAuth login CSRF). See
    // TokenService.signOAuthState and GoogleAuthGuard.
    let next: string | undefined;
    let intent: 'CLIENT' | 'OWNER' | undefined;
    try {
      const decoded = this.tokenService.verifyOAuthState(rawState);
      if (!nonceCookie || decoded.nonce !== nonceCookie) {
        throw new UnauthorizedException('State invalido');
      }
      next = decoded.next;
      intent = decoded.intent;
    } catch {
      clearOAuthNonceCookie(res);
      res.redirect(`${frontendUrl}/login?error=oauth_state_invalid`);
      return;
    }
    clearOAuthNonceCookie(res);

    const profile = req.user as GoogleProfile;
    const auth = await this.authService.loginOrRegisterWithGoogle(profile, intent);
    setAuthCookies(res, auth, this.tokenService.getRefreshTokenExpiresAt(auth.refreshToken));

    const redirectPath = isSafeNextPath(next) ? next : defaultRedirectForRole(auth.user.role);
    // `justLinked` only means "the frontend should show the one-time linking toast" — everything
    // else about the session already happened server-side above, so this is display state, not
    // auth state, and is safe to pass as a plain (non-sensitive) query param.
    const linkedParam = auth.justLinked
      ? (redirectPath.includes('?') ? '&' : '?') + 'linked=google'
      : '';
    res.redirect(`${frontendUrl}${redirectPath}${linkedParam}`);
  }
}
