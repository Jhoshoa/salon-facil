import { Test, TestingModule } from '@nestjs/testing';
import { VenueService } from '../../../src/modules/venue/application/services/venue.service';
import { SlugService } from '../../../src/modules/venue/application/services/slug.service';
import { VENUE_REPOSITORY } from '../../../src/modules/venue/domain/repositories/venue.repository.interface';
import { CloudinaryService } from '../../../src/modules/upload/cloudinary.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  MAX_VENUE_PHOTOS,
  VenueStatus,
} from '../../../src/modules/venue/domain/entities/venue.entity';
import { UserRole } from '../../../src/modules/auth/domain/entities/user.entity';
import { AuditLogService } from '../../../src/modules/audit-log/audit-log.service';
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from '../../../src/modules/audit-log/audit-log-actions';
import { AuthService } from '../../../src/modules/auth/application/services/auth.service';
import { TokenService } from '../../../src/modules/auth/application/services/token.service';

describe('VenueService', () => {
  let service: VenueService;
  let mockRepository: Record<string, jest.Mock>;
  let mockSlugService: Record<string, jest.Mock>;
  let mockCloudinaryService: Record<string, jest.Mock>;
  let mockAuditLogService: Record<string, jest.Mock>;
  let mockAuthService: Record<string, jest.Mock>;
  let mockTokenService: Record<string, jest.Mock>;

  const mockVenue = {
    id: 'venue-1',
    ownerId: 'owner-1',
    name: 'Salon Perfecto',
    slug: 'salon-perfecto',
    description: 'Un salon perfecto para eventos',
    address: 'Av. 6 de Octubre',
    district: 'Zone 1',
    city: 'El Alto',
    capacityMax: 200,
    photos: ['photo1.jpg'],
    status: VenueStatus.ACTIVE,
    isVerified: true,
    viewCount: 0,
    bookingCount: 0,
    canBeEditedBy: jest.fn(),
    isPublic: jest.fn().mockReturnValue(true),
    services: [],
    prices: [],
  };

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByOwner: jest.fn(),
      search: jest.fn(),
      findAmenities: jest.fn(),
      findSpaceTypes: jest.fn(),
      findUseTypes: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      incrementViewCount: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn(),
      findAllForAdmin: jest.fn(),
      countByStatus: jest.fn(),
      existsBySlug: jest.fn(),
      addMedia: jest.fn(),
      deleteMedia: jest.fn(),
      createPreviewToken: jest.fn(),
      findVenueIdByPreviewToken: jest.fn(),
      reassignOwner: jest.fn(),
    };

    mockSlugService = {
      generateSlug: jest.fn().mockResolvedValue('salon-perfecto'),
    };

    mockCloudinaryService = {
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditLogService = {
      record: jest.fn(),
    };

    mockAuthService = {
      validateOwnerInviteToken: jest.fn(),
    };

    mockTokenService = {
      generateVenuePreviewToken: jest.fn().mockReturnValue('raw-preview-token'),
      hashToken: jest.fn().mockReturnValue('hashed-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueService,
        { provide: VENUE_REPOSITORY, useValue: mockRepository },
        { provide: SlugService, useValue: mockSlugService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<VenueService>(VenueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVenue', () => {
    it('should create a venue with slug', async () => {
      mockRepository.create.mockResolvedValue(mockVenue);

      const result = await service.createVenue(
        {
          name: 'Salon Perfecto',
          description: 'Un salon perfecto para eventos',
          address: 'Av. 6 de Octubre',
          district: 'Zone 1',
          capacityMax: 200,
        } as never,
        'owner-1',
      );

      expect(result.slug).toBe('salon-perfecto');
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });

  describe('getVenueBySlug', () => {
    it('should return venue and increment view count', async () => {
      mockRepository.findBySlug.mockResolvedValue(mockVenue);

      const result = await service.getVenueBySlug('salon-perfecto');

      expect(result.slug).toBe('salon-perfecto');
      expect(mockRepository.incrementViewCount).toHaveBeenCalledWith('venue-1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      await expect(service.getVenueBySlug('not-found')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if found but not public (e.g. deactivated)', async () => {
      mockRepository.findBySlug.mockResolvedValue({
        ...mockVenue,
        isPublic: jest.fn().mockReturnValue(false),
      });

      await expect(service.getVenueBySlug('salon-perfecto')).rejects.toThrow(NotFoundException);
      expect(mockRepository.incrementViewCount).not.toHaveBeenCalled();
    });
  });

  describe('getVenueByIdForViewer', () => {
    it('should return the venue when the caller can edit it (owner)', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(true);

      const result = await service.getVenueByIdForViewer('venue-1', 'owner-1', UserRole.OWNER);

      expect(result).toBe(mockVenue);
    });

    it('should throw ForbiddenException when the caller cannot edit it', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(false);

      await expect(
        service.getVenueByIdForViewer('venue-1', 'other-user', UserRole.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when the venue does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.getVenueByIdForViewer('missing', 'owner-1', UserRole.OWNER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllVenuesForAdmin', () => {
    it('should return paginated results, unfiltered by status', async () => {
      mockRepository.findAllForAdmin.mockResolvedValue({ venues: [mockVenue], total: 45 });

      const result = await service.getAllVenuesForAdmin({});

      expect(result).toEqual({ venues: [mockVenue], total: 45, page: 1, limit: 20, totalPages: 3 });
      expect(mockRepository.findAllForAdmin).toHaveBeenCalledWith({
        query: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should forward the search query and pagination params', async () => {
      mockRepository.findAllForAdmin.mockResolvedValue({ venues: [], total: 0 });

      await service.getAllVenuesForAdmin({ query: 'mario', page: 2, limit: 10 });

      expect(mockRepository.findAllForAdmin).toHaveBeenCalledWith({
        query: 'mario',
        page: 2,
        limit: 10,
      });
    });
  });

  describe('getVenueStatusCounts', () => {
    it('should forward query/departamento but never status', async () => {
      const counts = { DRAFT: 1, PENDING: 2, ACTIVE: 3, INACTIVE: 0, REJECTED: 0 };
      mockRepository.countByStatus.mockResolvedValue(counts);

      const result = await service.getVenueStatusCounts({ query: 'mario', departamento: 'LA_PAZ' });

      expect(result).toEqual(counts);
      expect(mockRepository.countByStatus).toHaveBeenCalledWith({
        query: 'mario',
        departamento: 'LA_PAZ',
      });
    });
  });

  describe('getMyVenues', () => {
    it('should return venues for owner', async () => {
      mockRepository.findByOwner.mockResolvedValue([mockVenue]);

      const result = await service.getMyVenues('owner-1');

      expect(result).toHaveLength(1);
      expect(mockRepository.findByOwner).toHaveBeenCalledWith('owner-1');
    });
  });

  describe('getVenuesByInviteToken', () => {
    it('returns the venues owned by the token holder for a valid token', async () => {
      mockAuthService.validateOwnerInviteToken.mockResolvedValue('owner-1');
      mockRepository.findByOwner.mockResolvedValue([mockVenue]);

      const result = await service.getVenuesByInviteToken('raw-token');

      expect(result).toHaveLength(1);
      expect(mockAuthService.validateOwnerInviteToken).toHaveBeenCalledWith('raw-token');
      expect(mockRepository.findByOwner).toHaveBeenCalledWith('owner-1');
    });

    it('throws NotFoundException for an invalid or expired token', async () => {
      mockAuthService.validateOwnerInviteToken.mockResolvedValue(null);

      await expect(service.getVenuesByInviteToken('bad-token')).rejects.toThrow(NotFoundException);
      expect(mockRepository.findByOwner).not.toHaveBeenCalled();
    });
  });

  describe('createVenuePreviewLink / getVenueByPreviewToken', () => {
    it('creates a preview token and returns the raw value, and audits it', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockRepository.createPreviewToken.mockResolvedValue(undefined);

      const token = await service.createVenuePreviewLink('venue-1', 'admin-1');

      expect(token).toBe('raw-preview-token');
      expect(mockRepository.createPreviewToken).toHaveBeenCalledWith(
        'venue-1',
        'hashed-token',
        expect.any(Date),
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-1',
          action: AUDIT_ACTION.VENUE_PREVIEW_LINK_CREATED,
          targetType: AUDIT_TARGET_TYPE.VENUE,
          targetId: 'venue-1',
        }),
      );
    });

    it('returns the venue for a valid preview token', async () => {
      mockRepository.findVenueIdByPreviewToken.mockResolvedValue('venue-1');
      mockRepository.findById.mockResolvedValue(mockVenue);

      const result = await service.getVenueByPreviewToken('raw-token');

      expect(result).toBe(mockVenue);
      expect(mockRepository.findVenueIdByPreviewToken).toHaveBeenCalledWith('hashed-token');
    });

    it('throws NotFoundException for an invalid or expired preview token', async () => {
      mockRepository.findVenueIdByPreviewToken.mockResolvedValue(null);

      await expect(service.getVenueByPreviewToken('bad-token')).rejects.toThrow(NotFoundException);
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('reassignOwner', () => {
    it('delegates to the repository with the given venue and owner ids', async () => {
      mockRepository.reassignOwner.mockResolvedValue(undefined);

      await service.reassignOwner('venue-1', 'owner-2');

      expect(mockRepository.reassignOwner).toHaveBeenCalledWith('venue-1', 'owner-2');
    });
  });

  describe('favorites', () => {
    it('addFavorite saves the favorite when the venue exists', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockRepository.addFavorite = jest.fn().mockResolvedValue(undefined);

      await service.addFavorite('user-1', 'venue-1');

      expect(mockRepository.addFavorite).toHaveBeenCalledWith('user-1', 'venue-1');
    });

    it('addFavorite throws NotFoundException for a venue that does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);
      mockRepository.addFavorite = jest.fn();

      await expect(service.addFavorite('user-1', 'missing-venue')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.addFavorite).not.toHaveBeenCalled();
    });

    it('removeFavorite delegates straight to the repository', async () => {
      mockRepository.removeFavorite = jest.fn().mockResolvedValue(undefined);

      await service.removeFavorite('user-1', 'venue-1');

      expect(mockRepository.removeFavorite).toHaveBeenCalledWith('user-1', 'venue-1');
    });

    it('getMyFavorites returns the full venues the user favorited', async () => {
      mockRepository.findFavoritedByUser = jest.fn().mockResolvedValue([mockVenue]);

      const result = await service.getMyFavorites('user-1');

      expect(result).toEqual([mockVenue]);
      expect(mockRepository.findFavoritedByUser).toHaveBeenCalledWith('user-1');
    });

    it('getMyFavoriteVenueIds returns just the IDs', async () => {
      mockRepository.findFavoritedVenueIds = jest.fn().mockResolvedValue(['venue-1', 'venue-2']);

      const result = await service.getMyFavoriteVenueIds('user-1');

      expect(result).toEqual(['venue-1', 'venue-2']);
    });
  });

  describe('updateVenue', () => {
    it('should update venue if owner', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(true);
      mockRepository.update.mockResolvedValue({
        ...mockVenue,
        name: 'Salon Updated',
      });

      const result = await service.updateVenue(
        'venue-1',
        { name: 'Salon Updated' },
        'owner-1',
        UserRole.OWNER,
      );

      expect(result.name).toBe('Salon Updated');
    });

    it('should not regenerate slug if name unchanged', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(true);
      mockRepository.update.mockResolvedValue(mockVenue);

      await service.updateVenue('venue-1', { name: 'Salon Perfecto' }, 'owner-1', UserRole.OWNER);

      expect(mockSlugService.generateSlug).not.toHaveBeenCalled();
    });

    it('should regenerate slug if name changed', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(true);
      mockSlugService.generateSlug.mockResolvedValue('nuevo-salon');
      mockRepository.update.mockResolvedValue({
        ...mockVenue,
        name: 'Nuevo Salon',
        slug: 'nuevo-salon',
      });

      const result = await service.updateVenue(
        'venue-1',
        { name: 'Nuevo Salon' },
        'owner-1',
        UserRole.OWNER,
      );

      expect(result.slug).toBe('nuevo-salon');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(false);

      await expect(
        service.updateVenue('venue-1', { name: 'Test' }, 'other-user', UserRole.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteVenue', () => {
    it('should soft delete venue if owner', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(true);

      await service.deleteVenue('venue-1', 'owner-1', UserRole.OWNER);

      expect(mockRepository.softDelete).toHaveBeenCalledWith('venue-1');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(false);

      await expect(service.deleteVenue('venue-1', 'other-user', UserRole.CLIENT)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deactivateVenue', () => {
    it('should pause an ACTIVE venue', async () => {
      mockRepository.findById.mockResolvedValue({ ...mockVenue, status: VenueStatus.ACTIVE });
      mockVenue.canBeEditedBy.mockReturnValue(true);
      mockRepository.updateStatus.mockResolvedValue({ ...mockVenue, status: VenueStatus.INACTIVE });

      await service.deactivateVenue('venue-1', 'owner-1', UserRole.OWNER);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('venue-1', VenueStatus.INACTIVE);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockRepository.findById.mockResolvedValue({ ...mockVenue, status: VenueStatus.ACTIVE });
      mockVenue.canBeEditedBy.mockReturnValue(false);

      await expect(
        service.deactivateVenue('venue-1', 'other-user', UserRole.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if the venue is not ACTIVE', async () => {
      mockRepository.findById.mockResolvedValue({ ...mockVenue, status: VenueStatus.DRAFT });
      mockVenue.canBeEditedBy.mockReturnValue(true);

      await expect(service.deactivateVenue('venue-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('reactivateVenue', () => {
    it('should bring an INACTIVE venue back to ACTIVE', async () => {
      mockRepository.findById.mockResolvedValue({ ...mockVenue, status: VenueStatus.INACTIVE });
      mockVenue.canBeEditedBy.mockReturnValue(true);
      mockRepository.updateStatus.mockResolvedValue({ ...mockVenue, status: VenueStatus.ACTIVE });

      await service.reactivateVenue('venue-1', 'owner-1', UserRole.OWNER);

      // No verifiedById passed — reactivation must not re-trigger admin verification.
      expect(mockRepository.updateStatus).toHaveBeenCalledWith('venue-1', VenueStatus.ACTIVE);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockRepository.findById.mockResolvedValue({ ...mockVenue, status: VenueStatus.INACTIVE });
      mockVenue.canBeEditedBy.mockReturnValue(false);

      await expect(
        service.reactivateVenue('venue-1', 'other-user', UserRole.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if the venue is not INACTIVE', async () => {
      mockRepository.findById.mockResolvedValue({ ...mockVenue, status: VenueStatus.ACTIVE });
      mockVenue.canBeEditedBy.mockReturnValue(true);

      await expect(service.reactivateVenue('venue-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('addVenueMedia / deleteVenueMedia', () => {
    it('should pass uploaded url/publicId pairs through to the repository', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(true);
      const uploads = [{ url: 'https://cdn/img1.jpg', publicId: 'salon-facil/venues/img1' }];
      mockRepository.addMedia.mockResolvedValue(uploads);

      await service.addVenueMedia('venue-1', 'owner-1', UserRole.OWNER, uploads);

      expect(mockRepository.addMedia).toHaveBeenCalledWith('venue-1', uploads);
    });

    it('should throw BadRequestException when the total would exceed MAX_VENUE_PHOTOS', async () => {
      mockRepository.findById.mockResolvedValue({
        ...mockVenue,
        media: Array.from({ length: MAX_VENUE_PHOTOS - 1 }, (_, i) => ({ id: `existing-${i}` })),
      });
      mockVenue.canBeEditedBy.mockReturnValue(true);
      const uploads = [
        { url: 'https://cdn/a.jpg', publicId: 'a' },
        { url: 'https://cdn/b.jpg', publicId: 'b' },
      ];

      await expect(
        service.addVenueMedia('venue-1', 'owner-1', UserRole.OWNER, uploads),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.addMedia).not.toHaveBeenCalled();
    });

    it('should allow adding photos that land exactly on MAX_VENUE_PHOTOS', async () => {
      mockRepository.findById.mockResolvedValue({
        ...mockVenue,
        media: Array.from({ length: MAX_VENUE_PHOTOS - 1 }, (_, i) => ({ id: `existing-${i}` })),
      });
      mockVenue.canBeEditedBy.mockReturnValue(true);
      const uploads = [{ url: 'https://cdn/a.jpg', publicId: 'a' }];
      mockRepository.addMedia.mockResolvedValue(uploads);

      await service.addVenueMedia('venue-1', 'owner-1', UserRole.OWNER, uploads);

      expect(mockRepository.addMedia).toHaveBeenCalledWith('venue-1', uploads);
    });

    it('should throw ForbiddenException when a non-owner adds media', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(false);

      await expect(
        service.addVenueMedia('venue-1', 'other-user', UserRole.CLIENT, []),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete the Cloudinary asset when the deleted row had a cloudinaryId', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(true);
      mockRepository.deleteMedia.mockResolvedValue({ cloudinaryId: 'salon-facil/venues/img1' });

      await service.deleteVenueMedia('venue-1', 'media-1', 'owner-1', UserRole.OWNER);

      expect(mockRepository.deleteMedia).toHaveBeenCalledWith('venue-1', 'media-1');
      expect(mockCloudinaryService.deleteImage).toHaveBeenCalledWith('salon-facil/venues/img1');
    });

    it('should not call Cloudinary when the deleted row had no cloudinaryId (uploaded before this fix)', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(true);
      mockRepository.deleteMedia.mockResolvedValue({ cloudinaryId: null });

      await service.deleteVenueMedia('venue-1', 'media-1', 'owner-1', UserRole.OWNER);

      expect(mockCloudinaryService.deleteImage).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when a non-owner deletes media', async () => {
      mockRepository.findById.mockResolvedValue(mockVenue);
      mockVenue.canBeEditedBy.mockReturnValue(false);

      await expect(
        service.deleteVenueMedia('venue-1', 'media-1', 'other-user', UserRole.CLIENT),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepository.deleteMedia).not.toHaveBeenCalled();
    });
  });

  describe('searchVenues', () => {
    it('should return paginated results', async () => {
      mockRepository.search.mockResolvedValue({
        venues: [mockVenue],
        total: 1,
      });

      const result = await service.searchVenues({
        startDate: '2026-09-20',
        guestCount: 100,
        page: 1,
        limit: 20,
      } as never);

      expect(result.venues).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should reject search without start date', async () => {
      await expect(
        service.searchVenues({
          guestCount: 100,
        } as never),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it('should reject search without guest count', async () => {
      await expect(
        service.searchVenues({
          startDate: '2026-09-20',
        } as never),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it('should reject invalid date ranges', async () => {
      await expect(
        service.searchVenues({
          startDate: '2026-09-20',
          endDate: '2026-09-19',
          guestCount: 100,
        } as never),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it('should reject invalid price ranges', async () => {
      await expect(
        service.searchVenues({
          startDate: '2026-09-20',
          guestCount: 100,
          minPrice: 1000,
          maxPrice: 500,
        } as never),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it('should reject incomplete map bounds', async () => {
      await expect(
        service.searchVenues({
          startDate: '2026-09-20',
          guestCount: 100,
          north: -16.4,
          south: -16.6,
        } as never),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it('should reject incomplete time ranges', async () => {
      await expect(
        service.searchVenues({
          startDate: '2026-09-20',
          guestCount: 100,
          startTime: '18:00',
        } as never),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.search).not.toHaveBeenCalled();
    });
  });

  describe('catalogs', () => {
    it('should group amenities by category', async () => {
      mockRepository.findAmenities.mockResolvedValue([
        {
          id: 'amenity-1',
          key: 'private-parking',
          name: 'Parqueo privado',
          category: 'PARKING',
          icon: 'parking-circle',
          sortOrder: 1,
        },
      ]);

      const result = await service.getAmenitiesCatalog();

      expect(result.PARKING).toHaveLength(1);
      expect(result.PARKING[0].key).toBe('private-parking');
    });

    it('should return space and use type catalogs', () => {
      mockRepository.findSpaceTypes.mockReturnValue(['EVENT_HALL']);
      mockRepository.findUseTypes.mockReturnValue(['WEDDING']);

      expect(service.getSpaceTypesCatalog()).toEqual(['EVENT_HALL']);
      expect(service.getUseTypesCatalog()).toEqual(['WEDDING']);
    });
  });

  describe('verifyVenue', () => {
    it('should approve venue', async () => {
      mockRepository.updateStatus.mockResolvedValue({
        ...mockVenue,
        status: VenueStatus.ACTIVE,
        isVerified: true,
      });

      const result = await service.verifyVenue('venue-1', 'admin-1', true);

      expect(result.isVerified).toBe(true);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'venue-1',
        VenueStatus.ACTIVE,
        'admin-1',
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-1',
          action: AUDIT_ACTION.VENUE_APPROVED,
          targetType: AUDIT_TARGET_TYPE.VENUE,
          targetId: 'venue-1',
        }),
      );
    });

    it('should reject venue with a reason', async () => {
      mockRepository.updateStatus.mockResolvedValue({
        ...mockVenue,
        status: VenueStatus.REJECTED,
        rejectionReason: 'Fotos borrosas, no se distingue el espacio',
      });

      await service.verifyVenue(
        'venue-1',
        'admin-1',
        false,
        'Fotos borrosas, no se distingue el espacio',
      );

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'venue-1',
        VenueStatus.REJECTED,
        undefined,
        'Fotos borrosas, no se distingue el espacio',
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-1',
          action: AUDIT_ACTION.VENUE_REJECTED,
          targetType: AUDIT_TARGET_TYPE.VENUE,
          targetId: 'venue-1',
          metadata: expect.objectContaining({
            reason: 'Fotos borrosas, no se distingue el espacio',
          }),
        }),
      );
    });

    it('should reject venue without a reason', async () => {
      mockRepository.updateStatus.mockResolvedValue({
        ...mockVenue,
        status: VenueStatus.REJECTED,
      });

      await service.verifyVenue('venue-1', 'admin-1', false);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'venue-1',
        VenueStatus.REJECTED,
        undefined,
        undefined,
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-1',
          action: AUDIT_ACTION.VENUE_REJECTED,
          targetType: AUDIT_TARGET_TYPE.VENUE,
          targetId: 'venue-1',
        }),
      );
    });
  });
});
