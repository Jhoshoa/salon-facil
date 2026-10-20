import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminUserService } from '../../../src/modules/admin/application/services/admin-user.service';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '../../../src/modules/auth/domain/repositories/auth.repository.interface';
import {
  UserEntity,
  UserRole,
  UserStatus,
} from '../../../src/modules/auth/domain/entities/user.entity';
import { VENUE_REPOSITORY } from '../../../src/modules/venue/domain/repositories/venue.repository.interface';
import { VenueEntity, VenueStatus } from '../../../src/modules/venue/domain/entities/venue.entity';
import { BOOKING_REPOSITORY } from '../../../src/modules/booking/domain/repositories/booking.repository.interface';
import {
  BookingEntity,
  BookingStatus,
} from '../../../src/modules/booking/domain/entities/booking.entity';

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

const makeVenue = (overrides: Partial<VenueEntity> = {}) =>
  new VenueEntity({
    id: 'venue-1',
    ownerId: 'user-1',
    name: 'Salon Perfecto',
    slug: 'salon-perfecto',
    address: 'Av. 6 de Octubre',
    district: 'Zone 1',
    departamento: 'LA_PAZ' as VenueEntity['departamento'],
    capacityMax: 200,
    status: VenueStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeBooking = (overrides: Partial<BookingEntity> = {}) =>
  new BookingEntity({
    id: 'booking-1',
    venueId: 'venue-1',
    clientId: 'user-1',
    eventType: 'Boda',
    eventDate: new Date('2026-12-01'),
    endDate: new Date('2026-12-01'),
    startTime: '18:00',
    endTime: '23:00',
    guestCount: 100,
    basePrice: 1000,
    appliedPrice: 1000,
    totalPrice: 1000,
    depositAmount: 300,
    status: BookingStatus.APPROVED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('AdminUserService', () => {
  let service: AdminUserService;
  let authRepository: jest.Mocked<IAuthRepository>;
  let venueRepository: Record<string, jest.Mock>;
  let bookingRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    venueRepository = { findByOwner: jest.fn() };
    bookingRepository = { findByClient: jest.fn() };

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
      invalidateActivePasswordResetTokens: jest.fn(),
      findMany: jest.fn(),
      updateStatus: jest.fn(),
      updateRole: jest.fn(),
      countByRole: jest.fn(),
      countByStatus: jest.fn(),
      findIdentity: jest.fn(),
      createIdentity: jest.fn(),
      markEmailVerified: jest.fn(),
      createEmailVerificationCode: jest.fn(),
      findLatestActiveEmailVerificationCode: jest.fn(),
      incrementEmailVerificationAttempts: jest.fn(),
      markEmailVerificationCodeUsed: jest.fn(),
      invalidateActiveEmailVerificationCodes: jest.fn(),
      countEmailVerificationCodesSince: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserService,
        { provide: AUTH_REPOSITORY, useValue: authRepository },
        { provide: VENUE_REPOSITORY, useValue: venueRepository },
        { provide: BOOKING_REPOSITORY, useValue: bookingRepository },
      ],
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

  describe('updateUserRole', () => {
    it('updates the role of an existing user', async () => {
      authRepository.findById.mockResolvedValue(makeUser());
      authRepository.updateRole.mockResolvedValue(makeUser({ role: UserRole.OWNER }));

      const result = await service.updateUserRole('user-1', 'admin-1', { role: UserRole.OWNER });

      expect(result.role).toBe(UserRole.OWNER);
      expect(authRepository.updateRole).toHaveBeenCalledWith('user-1', UserRole.OWNER);
    });

    it('throws NotFoundException for a missing user', async () => {
      authRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateUserRole('missing', 'admin-1', { role: UserRole.OWNER }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an admin trying to change their own role', async () => {
      await expect(
        service.updateUserRole('admin-1', 'admin-1', { role: UserRole.OWNER }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserDetail', () => {
    it('throws NotFoundException for a missing user', async () => {
      authRepository.findById.mockResolvedValue(null);

      await expect(service.getUserDetail('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the venues for an OWNER and no bookings', async () => {
      authRepository.findById.mockResolvedValue(makeUser({ role: UserRole.OWNER }));
      venueRepository.findByOwner.mockResolvedValue([makeVenue()]);

      const result = await service.getUserDetail('user-1');

      expect(result.venues).toHaveLength(1);
      expect(result.bookings).toBeUndefined();
      expect(venueRepository.findByOwner).toHaveBeenCalledWith('user-1');
      expect(bookingRepository.findByClient).not.toHaveBeenCalled();
    });

    it('returns the bookings for a CLIENT and no venues', async () => {
      authRepository.findById.mockResolvedValue(makeUser({ role: UserRole.CLIENT }));
      bookingRepository.findByClient.mockResolvedValue([makeBooking()]);

      const result = await service.getUserDetail('user-1');

      expect(result.bookings).toHaveLength(1);
      expect(result.venues).toBeUndefined();
      expect(bookingRepository.findByClient).toHaveBeenCalledWith('user-1');
      expect(venueRepository.findByOwner).not.toHaveBeenCalled();
    });

    it('returns neither venues nor bookings for an ADMIN', async () => {
      authRepository.findById.mockResolvedValue(makeUser({ role: UserRole.ADMIN }));

      const result = await service.getUserDetail('user-1');

      expect(result.venues).toBeUndefined();
      expect(result.bookings).toBeUndefined();
      expect(venueRepository.findByOwner).not.toHaveBeenCalled();
      expect(bookingRepository.findByClient).not.toHaveBeenCalled();
    });
  });

  describe('getUserCounts', () => {
    it('combines role and status counts, each excluding its own filter', async () => {
      const roleCounts = { [UserRole.CLIENT]: 3, [UserRole.OWNER]: 2, [UserRole.ADMIN]: 1 };
      const statusCounts = {
        [UserStatus.ACTIVE]: 5,
        [UserStatus.INACTIVE]: 0,
        [UserStatus.SUSPENDED]: 1,
        [UserStatus.PENDING_VERIFICATION]: 0,
      };
      authRepository.countByRole.mockResolvedValue(roleCounts);
      authRepository.countByStatus.mockResolvedValue(statusCounts);

      const result = await service.getUserCounts({
        search: 'ana',
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
      });

      expect(result).toEqual({ role: roleCounts, status: statusCounts });
      expect(authRepository.countByRole).toHaveBeenCalledWith({
        search: 'ana',
        status: UserStatus.ACTIVE,
      });
      expect(authRepository.countByStatus).toHaveBeenCalledWith({
        search: 'ana',
        role: UserRole.CLIENT,
      });
    });
  });
});
