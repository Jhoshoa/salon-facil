import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../../../src/modules/booking/application/services/booking.service';
import { PriceCalculatorService } from '../../../src/modules/booking/application/services/price-calculator.service';
import { AvailabilityService } from '../../../src/modules/booking/application/services/availability.service';
import { BOOKING_REPOSITORY } from '../../../src/modules/booking/domain/repositories/booking.repository.interface';
import {
  BookingEntity,
  BookingStatus,
} from '../../../src/modules/booking/domain/entities/booking.entity';
import { VenueService } from '../../../src/modules/venue/application/services/venue.service';
import { VenueEntity, VenueStatus } from '../../../src/modules/venue/domain/entities/venue.entity';
import { UserRole } from '../../../src/modules/auth/domain/entities/user.entity';

const makeBooking = (overrides: Partial<BookingEntity> = {}) =>
  new BookingEntity({
    id: 'booking-1',
    venueId: 'venue-1',
    clientId: 'client-1',
    eventType: 'Boda',
    eventDate: new Date('2026-09-15'),
    startTime: '14:00',
    endTime: '22:00',
    guestCount: 100,
    basePrice: 5000,
    appliedPrice: 5000,
    totalPrice: 5000,
    depositAmount: 1500,
    depositPaid: false,
    status: BookingStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeVenue = (overrides: Partial<VenueEntity> = {}) =>
  new VenueEntity({
    id: 'venue-1',
    ownerId: 'owner-1',
    name: 'Salon Test',
    slug: 'salon-test',
    description: 'Test',
    address: 'Calle 1',
    district: 'Zona Sur',
    city: 'El Alto',
    capacityMax: 200,
    status: VenueStatus.ACTIVE,
    isVerified: true,
    photos: [],
    viewCount: 0,
    bookingCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('BookingService', () => {
  let service: BookingService;
  let mockBookingRepository: {
    findById: jest.Mock;
    findByVenueAndDate: jest.Mock;
    findByClient: jest.Mock;
    findByVenue: jest.Mock;
    findActiveByVenueInRange: jest.Mock;
    findByVenueAndStatus: jest.Mock;
    create: jest.Mock;
    updateStatus: jest.Mock;
    markDepositPaid: jest.Mock;
    hasConflict: jest.Mock;
    createCalendarBlock: jest.Mock;
    getCalendarBlocks: jest.Mock;
    findCalendarBlockById: jest.Mock;
    deleteCalendarBlock: jest.Mock;
    deleteCalendarBlockByVenueAndDate: jest.Mock;
    isDateBlocked: jest.Mock;
    countByVenueAndStatus: jest.Mock;
    incrementVenueBookingCount: jest.Mock;
  };
  let mockVenueService: {
    getVenueById: jest.Mock;
  };
  let mockPriceCalculator: {
    calculate: jest.Mock;
  };
  let mockAvailabilityService: {
    checkAvailability: jest.Mock;
  };

  beforeEach(async () => {
    mockBookingRepository = {
      findById: jest.fn(),
      findByVenueAndDate: jest.fn(),
      findByClient: jest.fn(),
      findByVenue: jest.fn(),
      findActiveByVenueInRange: jest.fn(),
      findByVenueAndStatus: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      markDepositPaid: jest.fn(),
      hasConflict: jest.fn(),
      createCalendarBlock: jest.fn(),
      getCalendarBlocks: jest.fn(),
      findCalendarBlockById: jest.fn(),
      deleteCalendarBlock: jest.fn(),
      deleteCalendarBlockByVenueAndDate: jest.fn(),
      isDateBlocked: jest.fn(),
      countByVenueAndStatus: jest.fn(),
      incrementVenueBookingCount: jest.fn(),
    };

    mockVenueService = {
      getVenueById: jest.fn(),
    };

    mockPriceCalculator = {
      calculate: jest.fn().mockReturnValue({
        basePrice: 5000,
        appliedPrice: 5000,
        totalPrice: 5000,
        depositAmount: 1500,
        priceBreakdown: {
          matchedPriceType: 'BASE',
          matchedPriceId: null,
          discountApplied: null,
          discountLabel: null,
        },
      }),
    };

    mockAvailabilityService = {
      checkAvailability: jest.fn().mockResolvedValue({
        available: true,
        reason: null,
        conflicts: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: BOOKING_REPOSITORY, useValue: mockBookingRepository },
        { provide: VenueService, useValue: mockVenueService },
        { provide: PriceCalculatorService, useValue: mockPriceCalculator },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestBooking', () => {
    const bookingDto = {
      eventType: 'Boda',
      eventDate: '2026-09-15',
      startTime: '14:00',
      endTime: '22:00',
      guestCount: 100,
    };

    it('should create a booking successfully', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.create.mockResolvedValue(makeBooking());

      const result = await service.requestBooking('venue-1', 'client-1', bookingDto);

      expect(result.booking.id).toBe('booking-1');
      expect(result.priceCalculation.basePrice).toBe(5000);
      expect(mockBookingRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when guest count exceeds capacity', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ capacityMax: 50 }));

      await expect(
        service.requestBooking('venue-1', 'client-1', { ...bookingDto, guestCount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when start time >= end time', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());

      await expect(
        service.requestBooking('venue-1', 'client-1', {
          ...bookingDto,
          startTime: '22:00',
          endTime: '14:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for past dates', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());

      await expect(
        service.requestBooking('venue-1', 'client-1', {
          ...bookingDto,
          eventDate: '2020-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when date is not available', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockAvailabilityService.checkAvailability.mockResolvedValue({
        available: false,
        reason: 'Fecha ya reservada',
        conflicts: ['Fecha ya reservada'],
      });

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getBookingById', () => {
    it('should return a booking by id', async () => {
      mockBookingRepository.findById.mockResolvedValue(makeBooking());

      const result = await service.getBookingById('booking-1');

      expect(result.id).toBe('booking-1');
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      mockBookingRepository.findById.mockResolvedValue(null);

      await expect(service.getBookingById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveBooking', () => {
    it('should approve a pending booking', async () => {
      mockBookingRepository.findById.mockResolvedValue(makeBooking());
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.updateStatus.mockResolvedValue(
        makeBooking({ status: BookingStatus.APPROVED }),
      );

      const result = await service.approveBooking('booking-1', 'owner-1', UserRole.OWNER);

      expect(result.status).toBe(BookingStatus.APPROVED);
      expect(mockBookingRepository.updateStatus).toHaveBeenCalledWith(
        'booking-1',
        BookingStatus.APPROVED,
      );
    });

    it('should throw ForbiddenException when not venue owner', async () => {
      mockBookingRepository.findById.mockResolvedValue(makeBooking());
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'other-owner' }));

      await expect(service.approveBooking('booking-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when booking is not pending', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.APPROVED }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());

      await expect(service.approveBooking('booking-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelBookingByClient', () => {
    it('should cancel a pending booking by client', async () => {
      mockBookingRepository.findById.mockResolvedValue(makeBooking());
      mockBookingRepository.updateStatus.mockResolvedValue(
        makeBooking({ status: BookingStatus.CANCELLED_BY_CLIENT }),
      );

      const result = await service.cancelBookingByClient('booking-1', 'client-1');

      expect(result.status).toBe(BookingStatus.CANCELLED_BY_CLIENT);
    });

    it('should throw ForbiddenException when canceling another client booking', async () => {
      mockBookingRepository.findById.mockResolvedValue(makeBooking({ clientId: 'other-client' }));

      await expect(service.cancelBookingByClient('booking-1', 'client-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException for fully paid bookings', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.FULLY_PAID }),
      );

      await expect(service.cancelBookingByClient('booking-1', 'client-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markDepositPaid', () => {
    it('should mark deposit as paid for approved booking', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.APPROVED }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.markDepositPaid.mockResolvedValue(
        makeBooking({ status: BookingStatus.DEPOSIT_PAID, depositPaid: true }),
      );

      const result = await service.markDepositPaid('booking-1', 'owner-1', UserRole.OWNER);

      expect(result.status).toBe(BookingStatus.DEPOSIT_PAID);
      expect(result.depositPaid).toBe(true);
      expect(mockBookingRepository.markDepositPaid).toHaveBeenCalledWith('booking-1');
    });

    it('should throw BadRequestException when booking is not approved', async () => {
      mockBookingRepository.findById.mockResolvedValue(makeBooking());

      await expect(service.markDepositPaid('booking-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user cannot edit venue', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.APPROVED }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'other-owner' }));

      await expect(service.markDepositPaid('booking-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createCalendarBlock', () => {
    it('should create a calendar block', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.isDateBlocked.mockResolvedValue(false);
      mockBookingRepository.hasConflict.mockResolvedValue(false);
      mockBookingRepository.createCalendarBlock.mockResolvedValue({
        id: 'block-1',
        venueId: 'venue-1',
        date: new Date('2026-09-15'),
        reason: 'Maintenance',
      });

      const result = await service.createCalendarBlock(
        'venue-1',
        { date: new Date('2026-09-15'), reason: 'Maintenance' },
        'owner-1',
        UserRole.OWNER,
      );

      expect(result.id).toBe('block-1');
    });

    it('should throw ConflictException when date is already blocked', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.isDateBlocked.mockResolvedValue(true);

      await expect(
        service.createCalendarBlock(
          'venue-1',
          { date: new Date('2026-09-15') },
          'owner-1',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when date has an active booking', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.isDateBlocked.mockResolvedValue(false);
      mockBookingRepository.hasConflict.mockResolvedValue(true);

      await expect(
        service.createCalendarBlock(
          'venue-1',
          { date: new Date('2026-09-15') },
          'owner-1',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when not venue owner', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'other-owner' }));

      await expect(
        service.createCalendarBlock(
          'venue-1',
          { date: new Date('2026-09-15') },
          'owner-1',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
