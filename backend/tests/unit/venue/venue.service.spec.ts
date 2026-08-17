import { Test, TestingModule } from '@nestjs/testing';
import { VenueService } from '../../../src/modules/venue/application/services/venue.service';
import { SlugService } from '../../../src/modules/venue/application/services/slug.service';
import { VENUE_REPOSITORY } from '../../../src/modules/venue/domain/repositories/venue.repository.interface';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { VenueStatus } from '../../../src/modules/venue/domain/entities/venue.entity';
import { UserRole } from '../../../src/modules/auth/domain/entities/user.entity';

describe('VenueService', () => {
  let service: VenueService;
  let mockRepository: Record<string, jest.Mock>;
  let mockSlugService: Record<string, jest.Mock>;

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
    services: [],
    prices: [],
  };

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByOwner: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      incrementViewCount: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn(),
      existsBySlug: jest.fn(),
    };

    mockSlugService = {
      generateSlug: jest.fn().mockResolvedValue('salon-perfecto'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueService,
        { provide: VENUE_REPOSITORY, useValue: mockRepository },
        { provide: SlugService, useValue: mockSlugService },
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
  });

  describe('getMyVenues', () => {
    it('should return venues for owner', async () => {
      mockRepository.findByOwner.mockResolvedValue([mockVenue]);

      const result = await service.getMyVenues('owner-1');

      expect(result).toHaveLength(1);
      expect(mockRepository.findByOwner).toHaveBeenCalledWith('owner-1');
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

  describe('searchVenues', () => {
    it('should return paginated results', async () => {
      mockRepository.search.mockResolvedValue({
        venues: [mockVenue],
        total: 1,
      });

      const result = await service.searchVenues({
        page: 1,
        limit: 20,
      } as never);

      expect(result.venues).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
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
    });

    it('should reject venue', async () => {
      mockRepository.updateStatus.mockResolvedValue({
        ...mockVenue,
        status: VenueStatus.REJECTED,
      });

      await service.verifyVenue('venue-1', 'admin-1', false);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('venue-1', VenueStatus.REJECTED);
    });
  });
});
