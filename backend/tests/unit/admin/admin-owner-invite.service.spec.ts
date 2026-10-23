import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminOwnerInviteService } from '../../../src/modules/admin/application/services/admin-owner-invite.service';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '../../../src/modules/auth/domain/repositories/auth.repository.interface';
import {
  UserEntity,
  UserRole,
  UserStatus,
} from '../../../src/modules/auth/domain/entities/user.entity';
import { AuthService } from '../../../src/modules/auth/application/services/auth.service';
import { VenueService } from '../../../src/modules/venue/application/services/venue.service';
import { VenueEntity, VenueStatus } from '../../../src/modules/venue/domain/entities/venue.entity';
import { NotificationService } from '../../../src/modules/notification/application/services/notification.service';
import { AuditLogService } from '../../../src/modules/audit-log/audit-log.service';
import { AUDIT_ACTION } from '../../../src/modules/audit-log/audit-log-actions';
import { ConfigService } from '@nestjs/config';

const makeUser = (overrides: Partial<UserEntity> = {}) =>
  new UserEntity({
    id: 'owner-1',
    email: 'dueno@email.com',
    phone: '+59171234567',
    passwordHash: null,
    fullName: 'Dueno Placeholder',
    role: UserRole.OWNER,
    status: UserStatus.PENDING_VERIFICATION,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeVenue = (overrides: Partial<VenueEntity> = {}) =>
  new VenueEntity({
    id: 'venue-1',
    ownerId: 'owner-1',
    name: 'Salon Placeholder',
    slug: 'salon-placeholder',
    address: 'Av. de Prueba #1',
    district: 'Zona 1',
    departamento: 'LA_PAZ' as VenueEntity['departamento'],
    capacityMax: 150,
    status: VenueStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('AdminOwnerInviteService', () => {
  let service: AdminOwnerInviteService;
  let authRepository: jest.Mocked<IAuthRepository>;
  let authService: Record<string, jest.Mock>;
  let venueService: Record<string, jest.Mock>;
  let notificationService: Record<string, jest.Mock>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const createDto = {
    owner: { fullName: 'Dueno Placeholder', email: 'dueno@email.com', phone: '+59171234567' },
    venue: {
      name: 'Salon Placeholder',
      address: 'Av. de Prueba #1',
      district: 'Zona 1',
      departamento: 'LA_PAZ',
      capacityMax: 150,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

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
      createOwnerInviteToken: jest.fn(),
      findOwnerInviteToken: jest.fn(),
      markOwnerInviteTokenUsed: jest.fn(),
      invalidateActiveOwnerInviteTokens: jest.fn(),
      findPendingOwnerInvites: jest.fn(),
    };

    authService = { issueOwnerInviteToken: jest.fn() };
    venueService = {
      createVenue: jest.fn(),
      getVenueById: jest.fn(),
      getOwnerContact: jest.fn(),
      reassignOwner: jest.fn(),
    };
    notificationService = { enqueue: jest.fn().mockResolvedValue(undefined) };
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOwnerInviteService,
        { provide: AUTH_REPOSITORY, useValue: authRepository },
        { provide: AuthService, useValue: authService },
        { provide: VenueService, useValue: venueService },
        { provide: NotificationService, useValue: notificationService },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    service = module.get<AdminOwnerInviteService>(AdminOwnerInviteService);
  });

  describe('createPlaceholderOwnerAndVenue', () => {
    it('creates a new placeholder owner (no password, PENDING_VERIFICATION) when the email is unknown', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.create.mockResolvedValue(makeUser());
      venueService.createVenue.mockResolvedValue(makeVenue());

      const result = await service.createPlaceholderOwnerAndVenue(createDto, 'admin-1');

      expect(authRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'dueno@email.com',
          role: UserRole.OWNER,
          status: UserStatus.PENDING_VERIFICATION,
        }),
      );
      expect(authRepository.create.mock.calls[0][0]).not.toHaveProperty('passwordHash');
      expect(venueService.createVenue).toHaveBeenCalledWith(createDto.venue, 'owner-1');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AUDIT_ACTION.ADMIN_CREATED_PLACEHOLDER_OWNER }),
      );
      expect(result.owner.id).toBe('owner-1');
      expect(result.venue.id).toBe('venue-1');
    });

    it('upgrades an existing CLIENT to OWNER instead of creating a duplicate account', async () => {
      authRepository.findByEmail.mockResolvedValue(makeUser({ role: UserRole.CLIENT }));
      authRepository.updateRole.mockResolvedValue(makeUser({ role: UserRole.OWNER }));
      venueService.createVenue.mockResolvedValue(makeVenue());

      await service.createPlaceholderOwnerAndVenue(createDto, 'admin-1');

      expect(authRepository.updateRole).toHaveBeenCalledWith('owner-1', UserRole.OWNER);
      expect(authRepository.create).not.toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AUDIT_ACTION.OWNER_ROLE_UPGRADED_ON_INVITE }),
      );
    });

    it('reuses an existing OWNER as-is (same owner, another venue from a different call)', async () => {
      authRepository.findByEmail.mockResolvedValue(makeUser({ role: UserRole.OWNER }));
      venueService.createVenue.mockResolvedValue(makeVenue());

      await service.createPlaceholderOwnerAndVenue(createDto, 'admin-1');

      expect(authRepository.create).not.toHaveBeenCalled();
      expect(authRepository.updateRole).not.toHaveBeenCalled();
      expect(venueService.createVenue).toHaveBeenCalledWith(createDto.venue, 'owner-1');
    });

    it('rejects an email that belongs to an ADMIN account', async () => {
      authRepository.findByEmail.mockResolvedValue(makeUser({ role: UserRole.ADMIN }));

      await expect(service.createPlaceholderOwnerAndVenue(createDto, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(venueService.createVenue).not.toHaveBeenCalled();
    });
  });

  describe('sendInvite', () => {
    it('issues a token and enqueues both email and WhatsApp with the preview link', async () => {
      venueService.getVenueById.mockResolvedValue(makeVenue());
      venueService.getOwnerContact.mockResolvedValue({
        id: 'owner-1',
        email: 'dueno@email.com',
        phone: '+59171234567',
        fullName: 'Dueno Placeholder',
      });
      authService.issueOwnerInviteToken.mockResolvedValue({ token: 'raw-token', resent: false });

      const result = await service.sendInvite('venue-1', 'admin-1');

      expect(result.resent).toBe(false);
      expect(notificationService.enqueue).toHaveBeenCalledTimes(2);
      expect(notificationService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'EMAIL',
          recipientEmail: 'dueno@email.com',
          metadata: expect.objectContaining({
            kind: 'venueOwnerInvite',
            previewUrl: 'http://localhost:3000/preview/raw-token',
          }),
        }),
      );
      expect(notificationService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'WHATSAPP', recipientPhone: '+59171234567' }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AUDIT_ACTION.OWNER_INVITE_SENT }),
      );
    });

    it('records a resend when a prior active token existed', async () => {
      venueService.getVenueById.mockResolvedValue(makeVenue());
      venueService.getOwnerContact.mockResolvedValue({
        id: 'owner-1',
        email: 'dueno@email.com',
        phone: '+59171234567',
        fullName: 'Dueno Placeholder',
      });
      authService.issueOwnerInviteToken.mockResolvedValue({ token: 'raw-token-2', resent: true });

      const result = await service.sendInvite('venue-1', 'admin-1');

      expect(result.resent).toBe(true);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AUDIT_ACTION.OWNER_INVITE_RESENT }),
      );
    });

    it('throws NotFoundException when the venue has no resolvable owner contact', async () => {
      venueService.getVenueById.mockResolvedValue(makeVenue());
      venueService.getOwnerContact.mockResolvedValue(null);

      await expect(service.sendInvite('venue-1', 'admin-1')).rejects.toThrow(NotFoundException);
      expect(authService.issueOwnerInviteToken).not.toHaveBeenCalled();
    });
  });

  describe('assignOwnerAndSendInvite', () => {
    const assignDto = {
      fullName: 'Dueno Real',
      email: 'dueno-real@email.com',
      phone: '+59177654321',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    it('rejects when the venue already belongs to a non-ADMIN (real, claimed) owner', async () => {
      venueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'owner-1' }));
      authRepository.findById.mockResolvedValue(makeUser({ role: UserRole.OWNER }));

      await expect(
        service.assignOwnerAndSendInvite('venue-1', assignDto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(venueService.reassignOwner).not.toHaveBeenCalled();
      expect(authRepository.create).not.toHaveBeenCalled();
    });

    it('resolves/creates the owner, reassigns the venue, and sends the invite when the current owner is an ADMIN placeholder', async () => {
      venueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'admin-1' }));
      authRepository.findById.mockResolvedValue(makeUser({ id: 'admin-1', role: UserRole.ADMIN }));
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.create.mockResolvedValue(makeUser({ id: 'owner-2' }));
      venueService.getOwnerContact.mockResolvedValue({
        id: 'owner-2',
        email: 'dueno-real@email.com',
        phone: '+59177654321',
        fullName: 'Dueno Real',
      });
      authService.issueOwnerInviteToken.mockResolvedValue({ token: 'raw-token', resent: false });

      const result = await service.assignOwnerAndSendInvite('venue-1', assignDto, 'admin-1');

      expect(authRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'dueno-real@email.com', role: UserRole.OWNER }),
      );
      expect(venueService.reassignOwner).toHaveBeenCalledWith('venue-1', 'owner-2');
      expect(result.resent).toBe(false);
    });
  });

  describe('listPendingInvites', () => {
    it('paginates the repository result', async () => {
      authRepository.findPendingOwnerInvites.mockResolvedValue({
        items: [
          {
            id: 'owner-1',
            email: 'dueno@email.com',
            phone: '+59171234567',
            fullName: 'Dueno Placeholder',
            createdAt: new Date(),
            venues: [{ id: 'venue-1', name: 'Salon Placeholder', status: 'DRAFT' }],
            latestInvite: { sentAt: new Date(), expiresAt: new Date() },
          },
        ],
        total: 1,
      });

      const result = await service.listPendingInvites({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });
});
