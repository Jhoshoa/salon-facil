import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminUserService } from '../../../src/modules/admin/application/services/admin-user.service';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '../../../src/modules/auth/domain/repositories/auth.repository.interface';
import { UserEntity, UserRole, UserStatus } from '../../../src/modules/auth/domain/entities/user.entity';

const makeUser = (overrides: Partial<UserEntity> = {}) =>
  new UserEntity({
    id: 'user-1',
    email: 'user@email.com',
    phone: '+59171234567',
    passwordHash: 'hashed',
    fullName: 'Test User',
    role: UserRole.CLIENT,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('AdminUserService', () => {
  let service: AdminUserService;
  let authRepository: jest.Mocked<IAuthRepository>;

  beforeEach(async () => {
    authRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
      updateProfile: jest.fn(),
      exists: jest.fn(),
      createRefreshToken: jest.fn(),
      findActiveRefreshToken: jest.fn(),
      markRefreshTokenUsed: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllRefreshTokens: jest.fn(),
      updatePassword: jest.fn(),
      createPasswordResetToken: jest.fn(),
      findActivePasswordResetToken: jest.fn(),
      markPasswordResetTokenUsed: jest.fn(),
      findMany: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminUserService, { provide: AUTH_REPOSITORY, useValue: authRepository }],
    }).compile();

    service = module.get<AdminUserService>(AdminUserService);
  });

  describe('listUsers', () => {
    it('returns a paginated result built from the repository', async () => {
      authRepository.findMany.mockResolvedValue({ items: [makeUser()], total: 1 });

      const result = await service.listUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(authRepository.findMany).toHaveBeenCalledWith({
        search: undefined,
        role: undefined,
        status: undefined,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('updateUserStatus', () => {
    it('updates the status of an existing user', async () => {
      authRepository.findById.mockResolvedValue(makeUser());
      authRepository.updateStatus.mockResolvedValue(makeUser({ status: UserStatus.SUSPENDED }));

      const result = await service.updateUserStatus('user-1', 'admin-1', {
        status: UserStatus.SUSPENDED,
      });

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(authRepository.updateStatus).toHaveBeenCalledWith('user-1', UserStatus.SUSPENDED);
    });

    it('throws NotFoundException for a missing user', async () => {
      authRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateUserStatus('missing', 'admin-1', { status: UserStatus.SUSPENDED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an admin trying to change their own status', async () => {
      await expect(
        service.updateUserStatus('admin-1', 'admin-1', { status: UserStatus.SUSPENDED }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
