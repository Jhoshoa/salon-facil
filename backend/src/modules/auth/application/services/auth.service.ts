import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '../../domain/repositories/auth.repository.interface';
import { TokenService } from './token.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
    private readonly tokenService: TokenService,
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

    return this.buildAuthResponse(user, tokens);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('Tu cuenta esta suspendida o inactiva');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
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
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    if (storedToken.userId !== payload.sub) {
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
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }
}
