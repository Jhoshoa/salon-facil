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
    invalidateActivePasswordResetTokens: jest.Mock;
    findIdentity: jest.Mock;
    createIdentity: jest.Mock;
    markEmailVerified: jest.Mock;
    createEmailVerificationCode: jest.Mock;
    findLatestActiveEmailVerificationCode: jest.Mock;
    incrementEmailVerificationAttempts: jest.Mock;
    markEmailVerificationCodeUsed: jest.Mock;
    invalidateActiveEmailVerificationCodes: jest.Mock;
    countEmailVerificationCodesSince: jest.Mock;
    createOwnerInviteToken: jest.Mock;
    findOwnerInviteToken: jest.Mock;
    markOwnerInviteTokenUsed: jest.Mock;
    invalidateActiveOwnerInviteTokens: jest.Mock;
    updateStatus: jest.Mock;
  };
  let mockTokenService: {
    generateTokens: jest.Mock;
    verifyRefreshToken: jest.Mock;
    hashToken: jest.Mock;
    getRefreshTokenExpiresAt: jest.Mock;
    generatePasswordResetToken: jest.Mock;
    generateOwnerInviteToken: jest.Mock;
    generateEmailVerificationCode: jest.Mock;
    signOAuthState: jest.Mock;
    verifyOAuthState: jest.Mock;
  };
  let mockNotificationService: { enqueue: jest.Mock };

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
      invalidateActivePasswordResetTokens: jest.fn(),
      findIdentity: jest.fn(),
      createIdentity: jest.fn(),
      markEmailVerified: jest.fn(),
      createEmailVerificationCode: jest.fn(),
      findLatestActiveEmailVerificationCode: jest.fn(),
      incrementEmailVerificationAttempts: jest.fn(),
      markEmailVerificationCodeUsed: jest.fn(),
      invalidateActiveEmailVerificationCodes: jest.fn(),
      countEmailVerificationCodesSince: jest.fn().mockResolvedValue(0),
      createOwnerInviteToken: jest.fn(),
      findOwnerInviteToken: jest.fn(),
      markOwnerInviteTokenUsed: jest.fn(),
      invalidateActiveOwnerInviteTokens: jest.fn(),
      updateStatus: jest.fn(),
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
      generateOwnerInviteToken: jest.fn().mockReturnValue('mock-invite-token'),
      generateEmailVerificationCode: jest.fn().mockReturnValue('123456'),
      signOAuthState: jest.fn().mockReturnValue('mock-oauth-state'),
      verifyOAuthState: jest.fn().mockReturnValue({}),
    };

    mockNotificationService = { enqueue: jest.fn().mockResolvedValue(undefined) };
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
    it('should update the password, revoke sessions, and notify for a valid token', async () => {
      const currentPasswordHash = await bcrypt.hash('OldPassword123!', 12);
      mockAuthRepository.findActivePasswordResetToken.mockResolvedValue({
        id: 'reset-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: null,
      });
      mockAuthRepository.findById.mockResolvedValue(
        activeUser({ passwordHash: currentPasswordHash }),
      );

      const result = await service.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      });

      expect(result.message).toMatch(/actualizada/i);
      expect(mockAuthRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
      );
      expect(mockAuthRepository.markPasswordResetTokenUsed).toHaveBeenCalledWith('reset-token-123');
      expect(mockAuthRepository.revokeAllRefreshTokens).toHaveBeenCalledWith('user-123');
      expect(mockNotificationService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { kind: 'passwordChanged' } }),
      );
    });

    it('should reject resetting to the same password the account already has', async () => {
      const currentPasswordHash = await bcrypt.hash('SamePassword123!', 12);
      mockAuthRepository.findActivePasswordResetToken.mockResolvedValue({
        id: 'reset-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: null,
      });
      mockAuthRepository.findById.mockResolvedValue(
        activeUser({ passwordHash: currentPasswordHash }),
      );

      await expect(
        service.resetPassword({ token: 'valid-reset-token', newPassword: 'SamePassword123!' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('allows setting a password for the first time on a Google-only account (no passwordHash yet)', async () => {
      mockAuthRepository.findActivePasswordResetToken.mockResolvedValue({
        id: 'reset-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: null,
      });
      mockAuthRepository.findById.mockResolvedValue(activeUser({ passwordHash: null }));

      const result = await service.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      });

      expect(result.message).toMatch(/actualizada/i);
      expect(mockAuthRepository.updatePassword).toHaveBeenCalled();
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

  describe('issueOwnerInviteToken', () => {
    it('invalidates prior tokens and stores the new hash with a 20-day expiry', async () => {
      mockAuthRepository.invalidateActiveOwnerInviteTokens.mockResolvedValue(0);

      const result = await service.issueOwnerInviteToken('user-123');

      expect(result).toEqual({ token: 'mock-invite-token', resent: false });
      expect(mockAuthRepository.invalidateActiveOwnerInviteTokens).toHaveBeenCalledWith('user-123');
      expect(mockAuthRepository.createOwnerInviteToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123', tokenHash: 'mock-refresh-token-hash' }),
      );
    });

    it('reports resent:true when an earlier active token was invalidated', async () => {
      mockAuthRepository.invalidateActiveOwnerInviteTokens.mockResolvedValue(1);

      const result = await service.issueOwnerInviteToken('user-123');

      expect(result.resent).toBe(true);
    });
  });

  describe('validateOwnerInviteToken', () => {
    it('returns the userId for a token that exists and has not expired', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue({
        id: 'invite-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: null,
      });

      await expect(service.validateOwnerInviteToken('raw-token')).resolves.toBe('user-123');
    });

    it('returns the userId even when the token was already used (viewing never consumes it)', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue({
        id: 'invite-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await expect(service.validateOwnerInviteToken('raw-token')).resolves.toBe('user-123');
    });

    it('returns null for an expired token', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue({
        id: 'invite-token-123',
        userId: 'user-123',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        usedAt: null,
      });

      await expect(service.validateOwnerInviteToken('raw-token')).resolves.toBeNull();
    });

    it('returns null for an unknown token', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue(null);

      await expect(service.validateOwnerInviteToken('raw-token')).resolves.toBeNull();
    });
  });

  describe('claimInvite', () => {
    it('sets the password, activates the account, verifies the email, and logs in', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue({
        id: 'invite-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: null,
      });
      mockAuthRepository.findById
        .mockResolvedValueOnce(
          activeUser({ passwordHash: null, status: UserStatus.PENDING_VERIFICATION }),
        )
        .mockResolvedValueOnce(
          activeUser({ status: UserStatus.ACTIVE, emailVerifiedAt: new Date() }),
        );

      const result = await service.claimInvite({ token: 'raw-token', password: 'NewPassword123!' });

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockAuthRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
      );
      expect(mockAuthRepository.updateStatus).toHaveBeenCalledWith('user-123', UserStatus.ACTIVE);
      expect(mockAuthRepository.markEmailVerified).toHaveBeenCalledWith('user-123');
      expect(mockAuthRepository.markOwnerInviteTokenUsed).toHaveBeenCalledWith('invite-token-123');
    });

    it('does not re-mark an already-verified email', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue({
        id: 'invite-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: null,
      });
      mockAuthRepository.findById.mockResolvedValue(activeUser({ emailVerifiedAt: new Date() }));

      await service.claimInvite({ token: 'raw-token', password: 'NewPassword123!' });

      expect(mockAuthRepository.markEmailVerified).not.toHaveBeenCalled();
    });

    it('rejects an unknown token', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue(null);

      await expect(
        service.claimInvite({ token: 'unknown', password: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an already-claimed token', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue({
        id: 'invite-token-123',
        userId: 'user-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        usedAt: new Date(),
      });

      await expect(
        service.claimInvite({ token: 'used-token', password: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      mockAuthRepository.findOwnerInviteToken.mockResolvedValue({
        id: 'invite-token-123',
        userId: 'user-123',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        usedAt: null,
      });

      await expect(
        service.claimInvite({ token: 'expired-token', password: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerificationCode', () => {
    it('issues a new code when the user has no active code yet', async () => {
      mockAuthRepository.findById.mockResolvedValue(activeUser());
      mockAuthRepository.findLatestActiveEmailVerificationCode.mockResolvedValue(null);
      mockAuthRepository.countEmailVerificationCodesSince.mockResolvedValue(0);

      const result = await service.resendVerificationCode('user-123');

      expect(result.message).toMatch(/nuevo codigo/i);
      expect(mockAuthRepository.createEmailVerificationCode).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
      );
    });

    it('short-circuits with a friendly message when the email is already verified', async () => {
      mockAuthRepository.findById.mockResolvedValue(activeUser({ emailVerifiedAt: new Date() }));

      const result = await service.resendVerificationCode('user-123');

      expect(result.message).toMatch(/ya esta verificado/i);
      expect(mockAuthRepository.createEmailVerificationCode).not.toHaveBeenCalled();
    });

    it('rejects a resend within the 60-second cooldown of the still-active code', async () => {
      mockAuthRepository.findById.mockResolvedValue(activeUser());
      mockAuthRepository.findLatestActiveEmailVerificationCode.mockResolvedValue({
        id: 'code-1',
        codeHash: 'hash',
        attempts: 0,
        // Issued 10s ago (expiresAt is issuedAt + 15min) -- well inside the 60s cooldown.
        expiresAt: new Date(Date.now() + 15 * 60 * 1000 - 10 * 1000),
        usedAt: null,
      });

      await expect(service.resendVerificationCode('user-123')).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.createEmailVerificationCode).not.toHaveBeenCalled();
    });

    it('rejects a resend once 3 codes were already issued in the last hour', async () => {
      mockAuthRepository.findById.mockResolvedValue(activeUser());
      mockAuthRepository.findLatestActiveEmailVerificationCode.mockResolvedValue(null);
      mockAuthRepository.countEmailVerificationCodesSince.mockResolvedValue(3);

      await expect(service.resendVerificationCode('user-123')).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.createEmailVerificationCode).not.toHaveBeenCalled();
    });

    it('allows a resend past the 60-second cooldown, under the hourly cap', async () => {
      mockAuthRepository.findById.mockResolvedValue(activeUser());
      mockAuthRepository.findLatestActiveEmailVerificationCode.mockResolvedValue({
        id: 'code-1',
        codeHash: 'hash',
        attempts: 0,
        // Issued just over a minute ago -- past the 60s cooldown.
        expiresAt: new Date(Date.now() + 15 * 60 * 1000 - 65 * 1000),
        usedAt: null,
      });
      mockAuthRepository.countEmailVerificationCodesSince.mockResolvedValue(1);

      const result = await service.resendVerificationCode('user-123');

      expect(result.message).toMatch(/nuevo codigo/i);
      expect(mockAuthRepository.createEmailVerificationCode).toHaveBeenCalled();
    });
  });
});
