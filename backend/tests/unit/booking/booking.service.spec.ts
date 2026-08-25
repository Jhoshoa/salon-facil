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
    endDate: new Date('2026-09-15'),
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
    findBookedDatesInRange: jest.Mock;
    findByVenueAndStatus: jest.Mock;
    create: jest.Mock;
    updateStatus: jest.Mock;
    markDepositPaid: jest.Mock;
    hasConflict: jest.Mock;
    deleteBookingDatesByBookingId: jest.Mock;
    createCalendarBlock: jest.Mock;
    getCalendarBlocks: jest.Mock;
    findCalendarBlockById: jest.Mock;
    deleteCalendarBlock: jest.Mock;
    isDateBlocked: jest.Mock;
    countByVenueAndStatus: jest.Mock;
    incrementVenueBookingCount: jest.Mock;
  };
  let mockVenueService: {
    getVenueById: jest.Mock;
  };
  let mockPriceCalculator: {
    calculate: jest.Mock;
    calculateRange: jest.Mock;
    resolveUnitForDate: jest.Mock;
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
      findBookedDatesInRange: jest.fn().mockResolvedValue([]),
      findByVenueAndStatus: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      markDepositPaid: jest.fn(),
      hasConflict: jest.fn(),
      deleteBookingDatesByBookingId: jest.fn(),
      createCalendarBlock: jest.fn(),
      getCalendarBlocks: jest.fn().mockResolvedValue([]),
      findCalendarBlockById: jest.fn(),
      deleteCalendarBlock: jest.fn(),
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
      calculateRange: jest.fn().mockReturnValue({
        basePrice: 5000,
        appliedPrice: 5000,
        totalPrice: 5000,
        depositAmount: 1500,
        days: [{ date: '2026-09-15', matchedPriceType: 'BASE', unit: 'EVENT', appliedPrice: 5000 }],
      }),
      // No per-rule unit overrides in these fixtures — mirrors production's fallback to the
      // venue's own priceUnit when no matching VenuePrice declares a unit of its own.
      resolveUnitForDate: jest.fn((_prices, _date, defaultUnit) => defaultUnit),
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
      mockBookingRepository.findBookedDatesInRange.mockResolvedValue(['2026-09-15']);

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when a date in range is blocked by the owner', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.getCalendarBlocks.mockResolvedValue([
        { id: 'block-1', date: new Date('2026-09-15'), reason: 'Mantenimiento' },
      ]);

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for a multi-day range when the venue does not allow it', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ allowsMultipleDays: false }));

      await expect(
        service.requestBooking('venue-1', 'client-1', { ...bookingDto, endDate: '2026-09-17' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when endDate is before eventDate', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ allowsMultipleDays: true }));

      await expect(
        service.requestBooking('venue-1', 'client-1', { ...bookingDto, endDate: '2026-09-10' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the range exceeds the max booking days', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ allowsMultipleDays: true }));

      await expect(
        service.requestBooking('venue-1', 'client-1', { ...bookingDto, endDate: '2026-12-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a multi-day booking successfully when the venue allows it', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ allowsMultipleDays: true }));
      mockPriceCalculator.calculateRange.mockReturnValue({
        basePrice: 5000,
        appliedPrice: 15000,
        totalPrice: 15000,
        depositAmount: 4500,
        days: [
          { date: '2026-09-15', matchedPriceType: 'BASE', appliedPrice: 5000 },
          { date: '2026-09-16', matchedPriceType: 'BASE', appliedPrice: 5000 },
          { date: '2026-09-17', matchedPriceType: 'BASE', appliedPrice: 5000 },
        ],
      });
      mockBookingRepository.create.mockResolvedValue(
        makeBooking({ endDate: new Date('2026-09-17') }),
      );

      const result = await service.requestBooking('venue-1', 'client-1', {
        ...bookingDto,
        endDate: '2026-09-17',
      });

      expect(result.priceCalculation.totalPrice).toBe(15000);
      const createCallArg = mockBookingRepository.create.mock.calls[0][0];
      expect(createCallArg.dailyBreakdown).toHaveLength(3);
    });

    it('should throw ConflictException when a day collides at insert time (unique constraint)', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('requestBooking — per-day schedule for mixed pricing units', () => {
    // Friday (day 5) resolves to HOUR, Saturday (day 6) resolves to DAY — simulates a venue
    // configured "por hora entre semana, por dia el fin de semana" (docs/fase-1 plan).
    const mixedVenue = () =>
      makeVenue({
        allowsMultipleDays: true,
        openingHours: [
          { id: 'oh-fri', dayOfWeek: 5, opensAt: '09:00', closesAt: '22:00', isClosed: false },
          { id: 'oh-sat', dayOfWeek: 6, opensAt: '10:00', closesAt: '20:00', isClosed: false },
        ],
      });
    const mixedDto = {
      eventType: 'Boda',
      eventDate: '2026-09-18', // Friday
      endDate: '2026-09-19', // Saturday
      startTime: '09:00',
      endTime: '22:00',
      guestCount: 100,
    };

    beforeEach(() => {
      mockVenueService.getVenueById.mockResolvedValue(mixedVenue());
      mockPriceCalculator.resolveUnitForDate.mockImplementation((_prices, date: Date) =>
        date.getUTCDay() === 5 ? 'HOUR' : 'DAY',
      );
      mockPriceCalculator.calculateRange.mockReturnValue({
        basePrice: 280,
        appliedPrice: 3140,
        totalPrice: 3140,
        depositAmount: 942,
        days: [
          { date: '2026-09-18', matchedPriceType: 'BASE', unit: 'HOUR', appliedPrice: 2240 },
          { date: '2026-09-19', matchedPriceType: 'WEEKEND', unit: 'DAY', appliedPrice: 900 },
        ],
      });
      mockBookingRepository.create.mockResolvedValue(
        makeBooking({ eventDate: new Date('2026-09-18'), endDate: new Date('2026-09-19') }),
      );
    });

    it('builds one BookingDate per day with its own resolved start/end time', async () => {
      await service.requestBooking('venue-1', 'client-1', {
        ...mixedDto,
        dailySchedule: [{ date: '2026-09-18', startTime: '18:00', endTime: '21:00' }],
      });

      const createCallArg = mockBookingRepository.create.mock.calls[0][0];
      expect(createCallArg.dailyBreakdown).toEqual([
        expect.objectContaining({ startTime: '18:00', endTime: '21:00' }),
        expect.objectContaining({ startTime: '10:00', endTime: '20:00' }), // Saturday: venue opening hours (DAY unit)
      ]);
    });

    it('falls back to the global startTime/endTime for HOUR days when no dailySchedule is sent', async () => {
      await service.requestBooking('venue-1', 'client-1', mixedDto);

      const createCallArg = mockBookingRepository.create.mock.calls[0][0];
      expect(createCallArg.dailyBreakdown[0]).toEqual(
        expect.objectContaining({ startTime: '09:00', endTime: '22:00' }),
      );
    });

    it('rejects an HOUR-day schedule outside the venue opening hours for that weekday', async () => {
      await expect(
        service.requestBooking('venue-1', 'client-1', {
          ...mixedDto,
          dailySchedule: [{ date: '2026-09-18', startTime: '07:00', endTime: '10:00' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when dailySchedule is missing an entry for a required HOUR day', async () => {
      await expect(
        service.requestBooking('venue-1', 'client-1', { ...mixedDto, dailySchedule: [] }),
      ).rejects.toThrow(/Falta el horario/);
    });

    it('rejects when dailySchedule includes an entry for a day that does not need one', async () => {
      await expect(
        service.requestBooking('venue-1', 'client-1', {
          ...mixedDto,
          dailySchedule: [
            { date: '2026-09-18', startTime: '18:00', endTime: '21:00' },
            { date: '2026-09-19', startTime: '11:00', endTime: '15:00' },
          ],
        }),
      ).rejects.toThrow(/no lo necesitan/);
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

  describe('getCalendar', () => {
    it('should return bookings and blocks mapped to date-only entries', async () => {
      mockBookingRepository.findActiveByVenueInRange.mockResolvedValue([
        {
          bookingId: 'booking-1',
          date: new Date('2026-09-15T00:00:00.000Z'),
          status: 'APPROVED',
          eventType: 'Boda',
        },
      ]);
      mockBookingRepository.getCalendarBlocks.mockResolvedValue([
        { id: 'block-1', date: new Date('2026-09-20T00:00:00.000Z'), reason: 'Mantenimiento' },
      ]);

      const result = await service.getCalendar(
        'venue-1',
        new Date('2026-09-01'),
        new Date('2026-09-30'),
      );

      expect(result.bookings).toEqual([
        {
          id: 'booking-1',
          date: '2026-09-15',
          type: 'booking',
          status: 'APPROVED',
          eventType: 'Boda',
        },
      ]);
      expect(result.blocks).toEqual([
        { id: 'block-1', date: '2026-09-20', type: 'block', reason: 'Mantenimiento' },
      ]);
    });

    it('should throw BadRequestException when the range exceeds the max allowed days', async () => {
      await expect(
        service.getCalendar('venue-1', new Date('2026-01-01'), new Date('2027-01-01')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      await expect(
        service.getCalendar('venue-1', new Date('2026-09-30'), new Date('2026-09-01')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a date is invalid', async () => {
      await expect(
        service.getCalendar('venue-1', new Date('not-a-date'), new Date('2026-09-30')),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
