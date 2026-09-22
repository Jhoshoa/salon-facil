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
import type { NotificationEmailMetadata } from '../../../notification/infrastructure/templates/notification-email.templates';

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const EMAIL_VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000; // 60 segundos

/** A Google account has no Bolivian phone to give us — this placeholder satisfies the
 * NOT NULL + UNIQUE `phone` column (unique per Google account since providerId is) without
 * making `phone` nullable across the whole codebase. It deliberately never matches the
 * +591XXXXXXXX format, so `hasCompletedProfile` below (and anything reusing that same regex)
 * reads it as "profile incomplete" until the user sets a real number. See
 * docs/auth-improvement/oauth-redirects-verification.md §1. */
const pendingPhonePlaceholder = (providerId: string) => `pending:${providerId}`;

export interface GoogleProfile {
  providerId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
}

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

    this.sendWelcomeNotification(user);
    await this.issueEmailVerificationCode(user);

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

    const passwordHash = user.passwordHash;
    if (!passwordHash) {
      this.logger.warn(`Login rejected — OAuth-only account has no password: ${user.id}`);
      throw new UnauthorizedException(
        'Esta cuenta usa Google para iniciar sesion. Usa el boton de Google.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed — wrong password for user: ${user.id}`);
      throw new UnauthorizedException('Credenciales invalidas');
    }

    await this.authRepository.updateLastLogin(user.id);

    const tokens = await this.issueTokens(user);

    return this.buildAuthResponse(user, tokens);
  }

  /** Called for a fresh Google identity that doesn't match any existing account by provider ID
   * or (Google-verified) email — creates a brand-new account. When it DOES match an existing
   * password-based account by email, that account is linked instead (see the caller,
   * loginOrRegisterWithGoogle) rather than a duplicate being created — the `email` column is
   * @unique so a duplicate isn't even possible without this being handled explicitly. */
  async loginOrRegisterWithGoogle(
    profile: GoogleProfile,
    intent?: 'CLIENT' | 'OWNER',
  ): Promise<AuthResponseDto & { justLinked?: boolean }> {
    const existingIdentity = await this.authRepository.findIdentity('google', profile.providerId);
    if (existingIdentity) {
      const user = await this.authRepository.findById(existingIdentity.userId);
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      if (!user.isActive()) {
        throw new UnauthorizedException('Tu cuenta esta suspendida o inactiva');
      }
      await this.authRepository.updateLastLogin(user.id);
      const tokens = await this.issueTokens(user);
      return this.buildAuthResponse(user, tokens);
    }

    // Google already proved this mailbox is real (emailVerified) — that's at least as strong a
    // proof of identity as our own (unverified-until-clicked) email/password registration, so an
    // existing account with that email gets linked automatically instead of erroring or
    // duplicating. See docs/auth-improvement/oauth-redirects-verification.md §3.
    const existingByEmail = profile.emailVerified
      ? await this.authRepository.findByEmail(profile.email)
      : null;

    if (existingByEmail) {
      if (!existingByEmail.isActive()) {
        throw new UnauthorizedException('Tu cuenta esta suspendida o inactiva');
      }
      await this.authRepository.createIdentity({
        userId: existingByEmail.id,
        provider: 'google',
        providerId: profile.providerId,
        email: profile.email,
      });
      if (!existingByEmail.isVerified()) {
        await this.authRepository.markEmailVerified(existingByEmail.id);
      }
      await this.authRepository.updateLastLogin(existingByEmail.id);
      // Linking itself is safe (Google already proved identity, see above) — but it's still a
      // new way into the account, and until now nothing ever told the account owner it happened.
      // A security notification on a channel the frontend redirect doesn't control (email) lets
      // them react fast if this *wasn't* them somehow (e.g. their Google session was compromised).
      this.sendAccountLinkedNotification(existingByEmail, 'Google');
      const tokens = await this.issueTokens(existingByEmail);
      return { ...this.buildAuthResponse(existingByEmail, tokens), justLinked: true };
    }

    const role = intent === UserRole.OWNER ? UserRole.OWNER : UserRole.CLIENT;
    const user = await this.authRepository.create({
      email: profile.email,
      phone: pendingPhonePlaceholder(profile.providerId),
      fullName: profile.fullName,
      role,
      emailVerifiedAt: profile.emailVerified ? new Date() : undefined,
    });
    await this.authRepository.createIdentity({
      userId: user.id,
      provider: 'google',
      providerId: profile.providerId,
      email: profile.email,
    });

    this.sendWelcomeNotification(user);

    const tokens = await this.issueTokens(user);
    return this.buildAuthResponse(user, tokens);
  }

  /** Types the code, checked in the "verifica tu email" modal — see
   * docs/auth-improvement/oauth-redirects-verification.md §4. */
  async verifyEmail(userId: string, code: string): Promise<{ message: string }> {
    const record = await this.authRepository.findLatestActiveEmailVerificationCode(userId);
    if (!record || record.expiresAt <= new Date()) {
      throw new BadRequestException('El codigo expiro o no existe. Pedi uno nuevo.');
    }
    if (record.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Superaste el numero de intentos permitidos. Pedi un codigo nuevo.',
      );
    }

    const isValid = this.tokenService.hashToken(code) === record.codeHash;
    if (!isValid) {
      await this.authRepository.incrementEmailVerificationAttempts(record.id);
      const remaining = EMAIL_VERIFICATION_MAX_ATTEMPTS - (record.attempts + 1);
      throw new BadRequestException(
        remaining > 0
          ? `Codigo incorrecto. Te quedan ${remaining} intentos.`
          : 'Codigo incorrecto. Superaste el numero de intentos — pedi uno nuevo.',
      );
    }

    await this.authRepository.markEmailVerificationCodeUsed(record.id);
    await this.authRepository.markEmailVerified(userId);
    return { message: 'Email verificado exitosamente' };
  }

  async resendVerificationCode(userId: string): Promise<{ message: string }> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    if (user.isVerified()) {
      return { message: 'Tu email ya esta verificado' };
    }

    const existing = await this.authRepository.findLatestActiveEmailVerificationCode(userId);
    if (existing && existing.expiresAt > new Date()) {
      const issuedAt = existing.expiresAt.getTime() - EMAIL_VERIFICATION_CODE_TTL_MS;
      if (Date.now() - issuedAt < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) {
        throw new BadRequestException('Espera un momento antes de pedir otro codigo.');
      }
    }

    await this.issueEmailVerificationCode(user);
    return { message: 'Te enviamos un nuevo codigo' };
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
    try {
      return await this.authRepository.updateProfile(userId, dto);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ese telefono ya esta en uso por otra cuenta');
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
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
        title: 'Restablece tu contrasena en Mi Evento',
        content: `Recibimos una solicitud para restablecer tu contrasena. Este enlace vence en 1 hora: ${resetUrl}. Si no fuiste vos, ignora este mensaje.`,
        recipientEmail: user.email,
        metadata: { kind: 'passwordReset', resetUrl } satisfies NotificationEmailMetadata,
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
        emailVerified: user.isVerified(),
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /** Best-effort — a failed welcome notification should never block registration/signup. */
  private sendWelcomeNotification(user: UserEntity): void {
    this.notificationService
      .enqueue({
        userId: user.id,
        type: NotificationType.WELCOME,
        title: `Bienvenido a Mi Evento, ${user.fullName.split(' ')[0]}`,
        content:
          user.role === UserRole.OWNER
            ? 'Gracias por registrarte. Ya podes crear tu primer local y empezar a recibir reservas.'
            : 'Gracias por registrarte. Ya podes buscar y reservar locales para tu proximo evento.',
        recipientEmail: user.email,
        metadata: {
          kind: 'welcome',
          firstName: user.fullName.split(' ')[0],
          role: user.role === UserRole.OWNER ? 'OWNER' : 'CLIENT',
        } satisfies NotificationEmailMetadata,
      })
      .catch(() => {
        // Best-effort — see method doc.
      });
  }

  /** Best-effort — see sendWelcomeNotification. Fires only when Google login auto-links to an
   * existing password account (see loginOrRegisterWithGoogle), never on routine logins. */
  private sendAccountLinkedNotification(user: UserEntity, provider: string): void {
    this.notificationService
      .enqueue({
        userId: user.id,
        type: NotificationType.ACCOUNT_LINKED,
        title: `Tu cuenta de Mi Evento ahora tambien usa ${provider}`,
        content: `Vinculamos tu cuenta con ${provider} para iniciar sesion. Si no fuiste vos, cambia tu contrasena de inmediato y contactanos.`,
        recipientEmail: user.email,
        metadata: { kind: 'accountLinked', provider } satisfies NotificationEmailMetadata,
      })
      .catch(() => {
        // Best-effort — see sendWelcomeNotification.
      });
  }

  /** Generates and sends a fresh 6-digit code, invalidating any still-active one first so a user
   * can never have two valid codes at once (avoids ambiguity about which one is checked). */
  private async issueEmailVerificationCode(user: UserEntity): Promise<void> {
    const code = this.tokenService.generateEmailVerificationCode();
    await this.authRepository.invalidateActiveEmailVerificationCodes(user.id);
    await this.authRepository.createEmailVerificationCode({
      userId: user.id,
      codeHash: this.tokenService.hashToken(code),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_CODE_TTL_MS),
    });

    this.notificationService
      .enqueue({
        userId: user.id,
        type: NotificationType.EMAIL_VERIFICATION,
        title: 'Verifica tu email en Mi Evento',
        content: `Tu codigo de verificacion es: ${code}. Vence en 15 minutos.`,
        recipientEmail: user.email,
        metadata: { kind: 'emailVerification', code } satisfies NotificationEmailMetadata,
      })
      .catch(() => {
        // Best-effort — see sendWelcomeNotification.
      });
  }
}
