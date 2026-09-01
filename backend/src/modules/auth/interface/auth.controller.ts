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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { AuthService } from '../application/services/auth.service';
import { RegisterDto } from '../application/dto/register.dto';
import { LoginDto } from '../application/dto/login.dto';
import { UpdateProfileDto } from '../application/dto/update-profile.dto';
import { ForgotPasswordDto } from '../application/dto/forgot-password.dto';
import { ResetPasswordDto } from '../application/dto/reset-password.dto';
import { AuthResponseDto, PublicAuthResponseDto } from '../application/dto/auth-response.dto';
import { LogoutDto } from '../application/dto/logout.dto';
import { UserEntity } from '../domain/entities/user.entity';
import { TokenService } from '../application/services/token.service';
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from './auth-cookies.util';

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
  facebookUrl: user.facebookUrl,
  instagramUrl: user.instagramUrl,
  tiktokUrl: user.tiktokUrl,
});

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
}
