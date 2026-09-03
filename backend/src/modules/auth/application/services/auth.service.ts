import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { NotificationType } from '@prisma/client';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '../../domain/repositories/auth.repository.interface';
import { TokenService } from './token.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { NotificationService } from '../../../notification/application/services/notification.service';

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
    private readonly tokenService: TokenService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('No se permite el registro de administradores por esta via');
    }

    const exists = await this.authRepository.exists(dto.email, dto.phone);
    if (exists) {
      throw new ConflictException('El email o telefono ya esta registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.authRepository.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      city: dto.city,
      district: dto.district,
    });

    const tokens = await this.issueTokens(user);

    this.notificationService
      .enqueue({
        userId: user.id,
        type: NotificationType.WELCOME,
        title: `Bienvenido a SalonFacil, ${user.fullName.split(' ')[0]}`,
        content:
          user.role === UserRole.OWNER
            ? 'Gracias por registrarte. Ya podes crear tu primer local y empezar a recibir reservas.'
            : 'Gracias por registrarte. Ya podes buscar y reservar locales para tu proximo evento.',
        recipientEmail: user.email,
      })
      .catch(() => {
        // Best-effort — a failed welcome notification should never block registration itself.
      });

    return this.buildAuthResponse(user, tokens);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      // Deliberately logs the attempted email, not the password — this is the standard audit
      // trail for spotting credential stuffing/enumeration after the fact, since nothing else
      // in the app records failed auth attempts (see docs/app-flows/README.md).
      this.logger.warn(`Login failed — no account for email: ${dto.email}`);
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!user.isActive()) {
      this.logger.warn(`Login rejected — account suspended/inactive: ${user.id}`);
      throw new UnauthorizedException('Tu cuenta esta suspendida o inactiva');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed — wrong password for user: ${user.id}`);
      throw new UnauthorizedException('Credenciales invalidas');
    }

    await this.authRepository.updateLastLogin(user.id);

    const tokens = await this.issueTokens(user);

    return this.buildAuthResponse(user, tokens);
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const tokenHash = this.tokenService.hashToken(refreshToken);
    const storedToken = await this.authRepository.findActiveRefreshToken(tokenHash);

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      // A validly-signed but revoked/expired/unknown refresh token is exactly what you'd see
      // if someone replayed a stolen or already-rotated token — worth a trace even though the
      // request is correctly rejected either way.
      this.logger.warn(`Refresh rejected — token not active for user: ${payload.sub}`);
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    if (storedToken.userId !== payload.sub) {
      this.logger.warn(
        `Refresh rejected — token/user mismatch (token user: ${storedToken.userId}, claimed: ${payload.sub})`,
      );
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const user = await this.authRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('Tu cuenta esta suspendida o inactiva');
    }

    await this.authRepository.markRefreshTokenUsed(storedToken.id);
    await this.authRepository.revokeRefreshToken(storedToken.id);

    const tokens = await this.issueTokens(user);

    return this.buildAuthResponse(user, tokens);
  }

  async validateUser(userId: string): Promise<UserEntity | null> {
    return this.authRepository.findById(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserEntity> {
    return this.authRepository.updateProfile(userId, dto);
  }

  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (!refreshToken) {
      await this.authRepository.revokeAllRefreshTokens(userId);
      return { message: 'Sesion cerrada exitosamente' };
    }

    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (payload.sub !== userId) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const tokenHash = this.tokenService.hashToken(refreshToken);
    const storedToken = await this.authRepository.findActiveRefreshToken(tokenHash);

    if (storedToken && storedToken.userId === userId && !storedToken.revokedAt) {
      await this.authRepository.revokeRefreshToken(storedToken.id);
    }

    return { message: 'Sesion cerrada exitosamente' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const message = 'Si el email existe, te enviamos un enlace para restablecer tu contrasena';
    const user = await this.authRepository.findByEmail(dto.email);

    // Same response whether or not the user exists, so this endpoint can't be used to
    // enumerate registered emails.
    if (!user) {
      return { message };
    }

    const token = this.tokenService.generatePasswordResetToken();
    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: this.tokenService.hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    this.notificationService
      .enqueue({
        userId: user.id,
        type: NotificationType.PASSWORD_RESET,
        title: 'Restablece tu contrasena en SalonFacil',
        content: `Recibimos una solicitud para restablecer tu contrasena. Este enlace vence en 1 hora: ${resetUrl}. Si no fuiste vos, ignora este mensaje.`,
        recipientEmail: user.email,
      })
      .catch(() => {
        // Best-effort — the response above is generic regardless, so a failed send here
        // is invisible to the client and only shows up as a failed notification row.
      });

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashToken(dto.token);
    const storedToken = await this.authRepository.findActivePasswordResetToken(tokenHash);

    if (!storedToken || storedToken.usedAt || storedToken.expiresAt <= new Date()) {
      throw new BadRequestException('El enlace de restablecimiento es invalido o expiro');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.authRepository.updatePassword(storedToken.userId, passwordHash);
    await this.authRepository.markPasswordResetTokenUsed(storedToken.id);
    // Invalidate every existing session — a leaked/stale access token shouldn't survive a
    // password reset.
    await this.authRepository.revokeAllRefreshTokens(storedToken.userId);

    return { message: 'Contrasena actualizada exitosamente' };
  }

  private async issueTokens(user: UserEntity): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const tokens = this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: this.tokenService.hashToken(tokens.refreshToken),
      expiresAt: this.tokenService.getRefreshTokenExpiresAt(tokens.refreshToken),
    });

    return tokens;
  }

  private buildAuthResponse(
    user: UserEntity,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ): AuthResponseDto {
    return {
      user: {
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
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }
}
