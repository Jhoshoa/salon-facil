import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../../src/modules/auth/application/services/auth.service';
import { TokenService } from '../../../src/modules/auth/application/services/token.service';
import {
  UserEntity,
  UserRole,
  UserStatus,
} from '../../../src/modules/auth/domain/entities/user.entity';
import { AUTH_REPOSITORY } from '../../../src/modules/auth/domain/repositories/auth.repository.interface';
import { NotificationService } from '../../../src/modules/notification/application/services/notification.service';

const activeUser = (overrides: Partial<UserEntity> = {}) =>
  new UserEntity({
    id: 'user-123',
    email: 'test@email.com',
    phone: '+59171234567',
    passwordHash: 'hashed',
    fullName: 'Test User',
    role: UserRole.CLIENT,
    status: UserStatus.ACTIVE,
    avatarUrl: null,
    city: null,
    district: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    ...overrides,
  });

describe('AuthService', () => {
  let service: AuthService;
  let mockAuthRepository: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    exists: jest.Mock;
    create: jest.Mock;
    updateLastLogin: jest.Mock;
    createRefreshToken: jest.Mock;
    findActiveRefreshToken: jest.Mock;
    markRefreshTokenUsed: jest.Mock;
    revokeRefreshToken: jest.Mock;
    revokeAllRefreshTokens: jest.Mock;
    updatePassword: jest.Mock;
    createPasswordResetToken: jest.Mock;
    findActivePasswordResetToken: jest.Mock;
    markPasswordResetTokenUsed: jest.Mock;
  };
  let mockTokenService: {
    generateTokens: jest.Mock;
    verifyRefreshToken: jest.Mock;
    hashToken: jest.Mock;
    getRefreshTokenExpiresAt: jest.Mock;
    generatePasswordResetToken: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
      createRefreshToken: jest.fn(),
      findActiveRefreshToken: jest.fn(),
      markRefreshTokenUsed: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllRefreshTokens: jest.fn(),
      updatePassword: jest.fn(),
      createPasswordResetToken: jest.fn(),
      findActivePasswordResetToken: jest.fn(),
      markPasswordResetTokenUsed: jest.fn(),
    };

    mockTokenService = {
      generateTokens: jest.fn().mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      }),
      verifyRefreshToken: jest.fn(),
      hashToken: jest.fn().mockReturnValue('mock-refresh-token-hash'),
      getRefreshTokenExpiresAt: jest.fn().mockReturnValue(new Date('2030-01-01T00:00:00.000Z')),
      generatePasswordResetToken: jest.fn().mockReturnValue('mock-reset-token'),
    };

    const mockNotificationService = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const mockConfigService = { get: jest.fn().mockReturnValue('http://localhost:3000') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AUTH_REPOSITORY, useValue: mockAuthRepository },
        { provide: TokenService, useValue: mockTokenService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@email.com',
      password: 'Password123!',
      phone: '+59171234567',
      fullName: 'Test User',
      role: 'CLIENT',
    };

    it('should register a new user and persist its refresh token', async () => {
      mockAuthRepository.exists.mockResolvedValue(false);
      mockAuthRepository.create.mockResolvedValue(activeUser());

      const result = await service.register(registerDto);

      expect(result.user.email).toBe('test@email.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toBe('mock-access-token');
      expect(mockAuthRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@email.com',
          phone: '+59171234567',
          role: 'CLIENT',
        }),
      );
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalledWith({
        userId: 'user-123',
        tokenHash: 'mock-refresh-token-hash',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });
    });

    it('should throw ConflictException if email or phone already exists', async () => {
      mockAuthRepository.exists.mockResolvedValue(true);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when trying to register as ADMIN', async () => {
      await expect(service.register({ ...registerDto, role: 'ADMIN' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@email.com', password: 'Password123!' };

    it('should login with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 12);
      mockAuthRepository.findByEmail.mockResolvedValue(activeUser({ passwordHash }));

      const result = await service.login(loginDto);

      expect(result.user.email).toBe('test@email.com');
      expect(mockAuthRepository.updateLastLogin).toHaveBeenCalledWith('user-123');
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid email', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 12);
      mockAuthRepository.findByEmail.mockResolvedValue(activeUser({ passwordHash }));

      await expect(service.login({ ...loginDto, password: 'WrongPassword' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive users', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 12);
      mockAuthRepository.findByEmail.mockResolvedValue(
        activeUser({ passwordHash, status: UserStatus.SUSPENDED }),
      );

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    beforeEach(() => {
      mockTokenService.verifyRefreshToken.mockReturnValue({
        sub: 'user-123',
        email: 'test@email.com',
        role: 'CLIENT',
        type: 'refresh',
        jti: 'refresh-jti',
      });
    });

    it('should rotate a valid refresh token', async () => {
      mockAuthRepository.findActiveRefreshToken.mockResolvedValue({
        id: 'refresh-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
      mockAuthRepository.findById.mockResolvedValue(activeUser());

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockAuthRepository.markRefreshTokenUsed).toHaveBeenCalledWith('refresh-token-123');
      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should reject unknown refresh tokens', async () => {
      mockAuthRepository.findActiveRefreshToken.mockResolvedValue(null);

      await expect(service.refreshTokens('unknown-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject revoked refresh tokens', async () => {
      mockAuthRepository.findActiveRefreshToken.mockResolvedValue({
        id: 'refresh-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        revokedAt: new Date(),
      });

      await expect(service.refreshTokens('revoked-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject inactive users', async () => {
      mockAuthRepository.findActiveRefreshToken.mockResolvedValue({
        id: 'refresh-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
      mockAuthRepository.findById.mockResolvedValue(activeUser({ status: UserStatus.SUSPENDED }));

      await expect(service.refreshTokens('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke a specific refresh token', async () => {
      mockTokenService.verifyRefreshToken.mockReturnValue({
        sub: 'user-123',
        email: 'test@email.com',
        role: 'CLIENT',
        type: 'refresh',
        jti: 'refresh-jti',
      });
      mockAuthRepository.findActiveRefreshToken.mockResolvedValue({
        id: 'refresh-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        revokedAt: null,
      });

      const result = await service.logout('user-123', 'valid-refresh-token');

      expect(result.message).toBe('Sesion cerrada exitosamente');
      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('refresh-token-123');
    });

    it('should revoke all user refresh tokens when no token is provided', async () => {
      const result = await service.logout('user-123');

      expect(result.message).toBe('Sesion cerrada exitosamente');
      expect(mockAuthRepository.revokeAllRefreshTokens).toHaveBeenCalledWith('user-123');
    });
  });

  describe('forgotPassword', () => {
    it('should create a reset token and enqueue an email for an existing user', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue(activeUser());

      const result = await service.forgotPassword({ email: 'test@email.com' });

      expect(result.message).toMatch(/enlace/i);
      expect(mockAuthRepository.createPasswordResetToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123', tokenHash: 'mock-refresh-token-hash' }),
      );
    });

    it('should return the same generic message when the email does not exist', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'unknown@email.com' });

      expect(result.message).toMatch(/enlace/i);
      expect(mockAuthRepository.createPasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should update the password and revoke sessions for a valid token', async () => {
      mockAuthRepository.findActivePasswordResetToken.mockResolvedValue({
        id: 'reset-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: null,
      });

      const result = await service.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      });

      expect(result.message).toMatch(/actualizada/i);
      expect(mockAuthRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
      );
      expect(mockAuthRepository.markPasswordResetTokenUsed).toHaveBeenCalledWith(
        'reset-token-123',
      );
      expect(mockAuthRepository.revokeAllRefreshTokens).toHaveBeenCalledWith('user-123');
    });

    it('should reject an unknown token', async () => {
      mockAuthRepository.findActivePasswordResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'unknown', newPassword: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an already-used token', async () => {
      mockAuthRepository.findActivePasswordResetToken.mockResolvedValue({
        id: 'reset-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: new Date(),
      });

      await expect(
        service.resetPassword({ token: 'used-token', newPassword: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an expired token', async () => {
      mockAuthRepository.findActivePasswordResetToken.mockResolvedValue({
        id: 'reset-token-123',
        userId: 'user-123',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        usedAt: null,
      });

      await expect(
        service.resetPassword({ token: 'expired-token', newPassword: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
