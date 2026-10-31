import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CalendarBlockStatus, PaymentPolicy } from '@prisma/client';
import { BookingService } from '../../../src/modules/booking/application/services/booking.service';
import { PriceCalculatorService } from '../../../src/modules/venue/application/services/price-calculator.service';
import { AvailabilityService } from '../../../src/modules/booking/application/services/availability.service';
import { BOOKING_REPOSITORY } from '../../../src/modules/booking/domain/repositories/booking.repository.interface';
import {
  BookingEntity,
  BookingStatus,
} from '../../../src/modules/booking/domain/entities/booking.entity';
import { VenueService } from '../../../src/modules/venue/application/services/venue.service';
import { VenueEntity, VenueStatus } from '../../../src/modules/venue/domain/entities/venue.entity';
import { UserRole } from '../../../src/modules/auth/domain/entities/user.entity';
import { NotificationService } from '../../../src/modules/notification/application/services/notification.service';

// Dates below are computed relative to "now" (in UTC, matching how the service parses bare
// yyyy-MM-dd strings and how the mixed-pricing-unit mocks read getUTCDay()) instead of hardcoded
// literals, so this suite never goes stale again the way it did when the dates it shipped with
// caught up to the real calendar and started tripping the "no puede ser en el pasado" guard.
const startOfTodayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};
const addDaysUTC = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);
const toISODate = (date: Date) => date.toISOString().slice(0, 10);
const nextWeekdayUTC = (from: Date, targetUTCDay: number) =>
  addDaysUTC(from, (targetUTCDay - from.getUTCDay() + 7) % 7);

// A generic "today" for these tests, comfortably 30 days out so it's never at risk of landing
// in the past for however long the suite goes unrun.
const ANCHOR = addDaysUTC(startOfTodayUTC(), 30);
const ANCHOR_DATE = toISODate(ANCHOR);
const ANCHOR_PLUS_1 = addDaysUTC(ANCHOR, 1);
const ANCHOR_PLUS_1_DATE = toISODate(ANCHOR_PLUS_1);
const ANCHOR_PLUS_2 = addDaysUTC(ANCHOR, 2);
const ANCHOR_PLUS_2_DATE = toISODate(ANCHOR_PLUS_2);
const ANCHOR_MINUS_5_DATE = toISODate(addDaysUTC(ANCHOR, -5));
// Beyond whatever the venue's max multi-day booking range is (same ~77-day gap the original
// fixed dates used between their "today" and their "exceeds max days" endDate).
const EXCEEDS_MAX_DAYS_DATE = toISODate(addDaysUTC(ANCHOR, 77));
// The mixed-pricing-unit and midnight-hours fixtures need a real Friday/Saturday pair (the venue
// mocks key opening hours off dayOfWeek 5/6), so these are computed rather than picked by hand.
const FRIDAY = nextWeekdayUTC(ANCHOR, 5);
const FRIDAY_DATE = toISODate(FRIDAY);
const SATURDAY = addDaysUTC(FRIDAY, 1);
const SATURDAY_DATE = toISODate(SATURDAY);

const makeBooking = (overrides: Partial<BookingEntity> = {}) =>
  new BookingEntity({
    id: 'booking-1',
    venueId: 'venue-1',
    clientId: 'client-1',
    eventType: 'Boda',
    eventDate: ANCHOR,
    endDate: ANCHOR,
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
    departamento: 'LA_PAZ',
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
    findAllForAdmin: jest.Mock;
    create: jest.Mock;
    updateStatus: jest.Mock;
    markDepositPaid: jest.Mock;
    hasConflict: jest.Mock;
    deleteBookingDatesByBookingId: jest.Mock;
    createCalendarBlock: jest.Mock;
    getCalendarBlocks: jest.Mock;
    findCalendarBlockById: jest.Mock;
    updateCalendarBlock: jest.Mock;
    deleteCalendarBlock: jest.Mock;
    isDateBlocked: jest.Mock;
    countByVenueAndStatus: jest.Mock;
    countPendingByOwner: jest.Mock;
    countAllPending: jest.Mock;
    findBookingsDueForReminder: jest.Mock;
    markReminderSent: jest.Mock;
  };
  let mockVenueService: {
    getVenueById: jest.Mock;
    getVenueByPreviewToken: jest.Mock;
    getOwnerContact: jest.Mock;
    listActiveRentalItems: jest.Mock;
  };
  let mockPriceCalculator: {
    calculate: jest.Mock;
    calculateRange: jest.Mock;
    resolveUnitForDate: jest.Mock;
    resolveDeposit: jest.Mock;
  };
  let mockAvailabilityService: {
    checkAvailability: jest.Mock;
  };
  let mockNotificationService: {
    enqueue: jest.Mock;
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
      findAllForAdmin: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      markDepositPaid: jest.fn(),
      hasConflict: jest.fn(),
      deleteBookingDatesByBookingId: jest.fn(),
      createCalendarBlock: jest.fn(),
      getCalendarBlocks: jest.fn().mockResolvedValue([]),
      findCalendarBlockById: jest.fn(),
      updateCalendarBlock: jest.fn(),
      deleteCalendarBlock: jest.fn(),
      isDateBlocked: jest.fn(),
      countByVenueAndStatus: jest.fn(),
      countPendingByOwner: jest.fn(),
      countAllPending: jest.fn(),
      findBookingsDueForReminder: jest.fn(),
      markReminderSent: jest.fn(),
    };

    mockVenueService = {
      getVenueById: jest.fn(),
      getVenueByPreviewToken: jest.fn(),
      getOwnerContact: jest.fn().mockResolvedValue(null),
      listActiveRentalItems: jest.fn().mockResolvedValue([]),
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
        days: [{ date: ANCHOR_DATE, matchedPriceType: 'BASE', unit: 'DAY', appliedPrice: 5000 }],
      }),
      // No per-rule unit overrides in these fixtures — mirrors production's fallback to the
      // venue's own priceUnit when no matching VenuePrice declares a unit of its own.
      resolveUnitForDate: jest.fn((_prices, _date, defaultUnit) => defaultUnit),
      // applySelectedExtras() always calls this for the final depositAmount -- default mirrors
      // the fixtures above (30% of the 5000 total used everywhere the extras total is 0).
      resolveDeposit: jest.fn().mockReturnValue(1500),
    };

    mockAvailabilityService = {
      checkAvailability: jest.fn().mockResolvedValue({
        available: true,
        reason: null,
        conflicts: [],
      }),
    };

    mockNotificationService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: BOOKING_REPOSITORY, useValue: mockBookingRepository },
        { provide: VenueService, useValue: mockVenueService },
        { provide: PriceCalculatorService, useValue: mockPriceCalculator },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: NotificationService, useValue: mockNotificationService },
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
      eventDate: ANCHOR_DATE,
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

    it('should throw ForbiddenException when the venue is not ACTIVE yet (e.g. still DRAFT)', async () => {
      mockVenueService.getVenueById.mockResolvedValue(
        makeVenue({ status: VenueStatus.DRAFT, isVerified: false }),
      );

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockBookingRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the venue is ACTIVE but not yet verified', async () => {
      mockVenueService.getVenueById.mockResolvedValue(
        makeVenue({ status: VenueStatus.ACTIVE, isVerified: false }),
      );

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ForbiddenException,
      );
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
      mockBookingRepository.findBookedDatesInRange.mockResolvedValue([ANCHOR_DATE]);

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when a date in range is blocked by the owner', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.getCalendarBlocks.mockResolvedValue([
        { id: 'block-1', date: ANCHOR, reason: 'Mantenimiento' },
      ]);

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for a multi-day range when the venue does not allow it', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ allowsMultipleDays: false }));

      await expect(
        service.requestBooking('venue-1', 'client-1', {
          ...bookingDto,
          endDate: ANCHOR_PLUS_2_DATE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when endDate is before eventDate', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ allowsMultipleDays: true }));

      await expect(
        service.requestBooking('venue-1', 'client-1', {
          ...bookingDto,
          endDate: ANCHOR_MINUS_5_DATE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the range exceeds the max booking days', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ allowsMultipleDays: true }));

      await expect(
        service.requestBooking('venue-1', 'client-1', {
          ...bookingDto,
          endDate: EXCEEDS_MAX_DAYS_DATE,
        }),
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
          { date: ANCHOR_DATE, matchedPriceType: 'BASE', appliedPrice: 5000 },
          { date: ANCHOR_PLUS_1_DATE, matchedPriceType: 'BASE', appliedPrice: 5000 },
          { date: ANCHOR_PLUS_2_DATE, matchedPriceType: 'BASE', appliedPrice: 5000 },
        ],
      });
      mockBookingRepository.create.mockResolvedValue(makeBooking({ endDate: ANCHOR_PLUS_2 }));

      const result = await service.requestBooking('venue-1', 'client-1', {
        ...bookingDto,
        endDate: ANCHOR_PLUS_2_DATE,
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

  describe('requestBooking — instant booking (Venue.instantBooking)', () => {
    const bookingDto = {
      eventType: 'Boda',
      eventDate: ANCHOR_DATE,
      startTime: '14:00',
      endTime: '22:00',
      guestCount: 100,
    };

    it('creates the booking already APPROVED when the venue has instant booking on', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ instantBooking: true }));
      mockBookingRepository.create.mockResolvedValue(
        makeBooking({ status: BookingStatus.APPROVED }),
      );

      await service.requestBooking('venue-1', 'client-1', bookingDto);

      const createCallArg = mockBookingRepository.create.mock.calls[0][0];
      expect(createCallArg.status).toBe(BookingStatus.APPROVED);
    });

    it('still creates the booking as PENDING when instant booking is off (the default)', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ instantBooking: false }));
      mockBookingRepository.create.mockResolvedValue(makeBooking());

      await service.requestBooking('venue-1', 'client-1', bookingDto);

      const createCallArg = mockBookingRepository.create.mock.calls[0][0];
      expect(createCallArg.status).toBe(BookingStatus.PENDING);
    });

    it('does not skip availability validation just because instant booking is on', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ instantBooking: true }));
      mockBookingRepository.findBookedDatesInRange.mockResolvedValue([ANCHOR_DATE]);

      await expect(service.requestBooking('venue-1', 'client-1', bookingDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockBookingRepository.create).not.toHaveBeenCalled();
    });

    it('notifies the owner that the booking auto-confirmed, and notifies the client it can pay already', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ instantBooking: true }));
      mockVenueService.getOwnerContact.mockResolvedValue({
        id: 'owner-1',
        email: 'owner@test.com',
      });
      mockBookingRepository.create.mockResolvedValue(
        makeBooking({
          status: BookingStatus.APPROVED,
          client: {
            id: 'client-1',
            fullName: 'Cliente Test',
            email: 'client@test.com',
            phone: null,
          },
        }),
      );

      await service.requestBooking('venue-1', 'client-1', bookingDto);

      const notifications = mockNotificationService.enqueue.mock.calls.map((call) => call[0]);
      expect(notifications).toContainEqual(
        expect.objectContaining({ userId: 'owner-1', type: 'BOOKING_REQUEST' }),
      );
      expect(notifications).toContainEqual(
        expect.objectContaining({ userId: 'client-1', type: 'BOOKING_CONFIRMED' }),
      );
    });

    it('does not notify the client when the booking is still PENDING (normal flow)', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ instantBooking: false }));
      mockBookingRepository.create.mockResolvedValue(
        makeBooking({
          client: { id: 'client-1', fullName: 'Cliente Test', email: 'c@test.com', phone: null },
        }),
      );

      await service.requestBooking('venue-1', 'client-1', bookingDto);

      const notifications = mockNotificationService.enqueue.mock.calls.map((call) => call[0]);
      expect(notifications.some((n) => n.type === 'BOOKING_CONFIRMED')).toBe(false);
    });
  });

  describe('catalog items in the quote (selectedRentalItems)', () => {
    const bookingDto = {
      eventType: 'Boda',
      eventDate: ANCHOR_DATE,
      startTime: '14:00',
      endTime: '22:00',
      guestCount: 100,
    };
    const previewDto = { eventDate: ANCHOR_DATE, startTime: '14:00', endTime: '22:00' };
    const silla = {
      id: 'silla',
      name: 'Silla',
      unitLabel: 'unidad',
      pricePerUnit: 12.5,
      isIncluded: false,
      chargeBasis: 'PER_DAY',
      stockQty: 80,
    };
    const toldo = {
      id: 'toldo',
      name: 'Toldo',
      unitLabel: 'por evento',
      pricePerUnit: 300,
      isIncluded: false,
      chargeBasis: 'PER_EVENT',
      stockQty: 5,
    };
    const mesaIncluida = {
      id: 'mesa',
      name: 'Mesa',
      unitLabel: 'unidad',
      pricePerUnit: null,
      isIncluded: true,
      stockQty: 10,
    };

    beforeEach(() => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockVenueService.listActiveRentalItems.mockResolvedValue([
        silla,
        toldo,
        mesaIncluida,
        { ...toldo, id: 'sin-stock', stockQty: null },
      ]);
      mockBookingRepository.create.mockResolvedValue(makeBooking());
    });

    it('adds quantity x current price to the total and computes the deposit on that total', async () => {
      mockPriceCalculator.resolveDeposit.mockReturnValue(1680);

      const result = await service.previewPrice('venue-1', {
        ...previewDto,
        selectedRentalItems: [
          { rentalItemId: 'silla', quantity: 4 },
          { rentalItemId: 'toldo', quantity: 2 },
        ],
      });

      expect(result.rentalItemsTotal).toBe(650);
      expect(result.totalPrice).toBe(5650);
      expect(mockPriceCalculator.resolveDeposit).toHaveBeenLastCalledWith(
        'DEPOSIT_THEN_REMAINING',
        30,
        5650,
      );
      expect(result.depositAmount).toBe(1680);
      expect(result.rentalItems[0]).toEqual({
        rentalItemId: 'silla',
        name: 'Silla',
        unitLabel: 'unidad',
        unitPrice: 12.5,
        quantity: 4,
        chargeBasis: 'PER_DAY',
        billedDays: 1,
        subtotal: 50,
      });
    });

    it('multiplies per-day items by the days of the booking, and per-event items only once', async () => {
      const result = await service.previewPrice('venue-1', {
        ...previewDto,
        endDate: ANCHOR_PLUS_2_DATE,
        selectedRentalItems: [
          { rentalItemId: 'silla', quantity: 4 },
          { rentalItemId: 'toldo', quantity: 2 },
        ],
      });

      expect(result.rentalItems).toEqual([
        expect.objectContaining({ rentalItemId: 'silla', billedDays: 3, subtotal: 150 }),
        expect.objectContaining({ rentalItemId: 'toldo', billedDays: 1, subtotal: 600 }),
      ]);
      expect(result.rentalItemsTotal).toBe(750);
    });

    it('persists the billed days so the quote stays explainable later', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ allowsMultipleDays: true }));

      await service.requestBooking('venue-1', 'client-1', {
        ...bookingDto,
        endDate: ANCHOR_PLUS_1_DATE,
        selectedRentalItems: [{ rentalItemId: 'silla', quantity: 1 }],
      });

      expect(mockBookingRepository.create.mock.calls[0][0].selectedRentalItems).toEqual([
        expect.objectContaining({ chargeBasis: 'PER_DAY', billedDays: 2, subtotal: 25 }),
      ]);
    });

    it('does not query the catalog when nothing was selected', async () => {
      const result = await service.previewPrice('venue-1', previewDto);

      expect(mockVenueService.listActiveRentalItems).not.toHaveBeenCalled();
      expect(result.rentalItems).toEqual([]);
      expect(result.rentalItemsTotal).toBe(0);
      expect(result.totalPrice).toBe(5000);
    });

    it('persists the snapshot on the booking', async () => {
      await service.requestBooking('venue-1', 'client-1', {
        ...bookingDto,
        selectedRentalItems: [{ rentalItemId: 'toldo', quantity: 1 }],
      });

      const createCallArg = mockBookingRepository.create.mock.calls[0][0];
      expect(createCallArg.totalPrice).toBe(5300);
      expect(createCallArg.selectedRentalItems).toEqual([
        {
          rentalItemId: 'toldo',
          name: 'Toldo',
          unitLabel: 'por evento',
          unitPrice: 300,
          quantity: 1,
          chargeBasis: 'PER_EVENT',
          billedDays: 1,
          subtotal: 300,
        },
      ]);
    });

    it('leaves the snapshot unset when nothing was selected', async () => {
      await service.requestBooking('venue-1', 'client-1', bookingDto);

      expect(mockBookingRepository.create.mock.calls[0][0].selectedRentalItems).toBeUndefined();
    });

    it('accepts exactly the stock and rejects one more', async () => {
      await expect(
        service.previewPrice('venue-1', {
          ...previewDto,
          selectedRentalItems: [{ rentalItemId: 'silla', quantity: 80 }],
        }),
      ).resolves.toMatchObject({ rentalItemsTotal: 1000 });

      await expect(
        service.previewPrice('venue-1', {
          ...previewDto,
          selectedRentalItems: [{ rentalItemId: 'silla', quantity: 81 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it.each([
      ['included with the venue', 'mesa'],
      ['deleted, inactive or from another venue', 'no-existe'],
      ['missing its stock, from before it was required', 'sin-stock'],
    ])('rejects an item that is %s, without creating anything', async (_label, rentalItemId) => {
      await expect(
        service.requestBooking('venue-1', 'client-1', {
          ...bookingDto,
          selectedRentalItems: [{ rentalItemId, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockBookingRepository.create).not.toHaveBeenCalled();
    });

    it('rejects the same item sent twice', async () => {
      await expect(
        service.previewPrice('venue-1', {
          ...previewDto,
          selectedRentalItems: [
            { rentalItemId: 'silla', quantity: 1 },
            { rentalItemId: 'silla', quantity: 2 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sends an instant-booking venue request to the owner when it includes catalog items', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ instantBooking: true }));

      await service.requestBooking('venue-1', 'client-1', {
        ...bookingDto,
        selectedRentalItems: [{ rentalItemId: 'toldo', quantity: 1 }],
      });

      expect(mockBookingRepository.create.mock.calls[0][0].status).toBe(BookingStatus.PENDING);
    });
  });

  describe('requestBooking — deposit follows the venue payment policy', () => {
    const bookingDto = {
      eventType: 'Boda',
      eventDate: ANCHOR_DATE,
      startTime: '14:00',
      endTime: '22:00',
      guestCount: 100,
    };

    it('resolves the deposit through PriceCalculatorService using the venue policy and percentage', async () => {
      const venue = makeVenue({
        paymentPolicy: PaymentPolicy.FULL_UPFRONT,
        depositPercentage: 30,
      });
      mockVenueService.getVenueById.mockResolvedValue(venue);
      mockBookingRepository.create.mockResolvedValue(makeBooking());

      await service.requestBooking('venue-1', 'client-1', bookingDto);

      expect(mockPriceCalculator.resolveDeposit).toHaveBeenCalledWith(
        venue.paymentPolicy,
        venue.depositPercentage,
        expect.any(Number),
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
      eventDate: FRIDAY_DATE,
      endDate: SATURDAY_DATE,
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
          { date: FRIDAY_DATE, matchedPriceType: 'BASE', unit: 'HOUR', appliedPrice: 2240 },
          { date: SATURDAY_DATE, matchedPriceType: 'WEEKEND', unit: 'DAY', appliedPrice: 900 },
        ],
      });
      mockBookingRepository.create.mockResolvedValue(
        makeBooking({ eventDate: FRIDAY, endDate: SATURDAY }),
      );
    });

    it('builds one BookingDate per day with its own resolved start/end time', async () => {
      await service.requestBooking('venue-1', 'client-1', {
        ...mixedDto,
        dailySchedule: [{ date: FRIDAY_DATE, startTime: '18:00', endTime: '21:00' }],
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
          dailySchedule: [{ date: FRIDAY_DATE, startTime: '07:00', endTime: '10:00' }],
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
            { date: FRIDAY_DATE, startTime: '18:00', endTime: '21:00' },
            { date: SATURDAY_DATE, startTime: '11:00', endTime: '15:00' },
          ],
        }),
      ).rejects.toThrow(/no lo necesitan/);
    });
  });

  describe('requestBooking — opening hours that close at midnight ("00:00")', () => {
    // A closesAt of "00:00" means "open until midnight", not "closes at the start of the
    // day" — naive string comparison ("23:00" > "00:00") used to reject perfectly valid
    // bookings inside a venue's own hours. Regression coverage for that fix.
    const midnightVenue = () =>
      makeVenue({
        priceUnit: 'HOUR' as never,
        openingHours: [
          { id: 'oh-fri', dayOfWeek: 5, opensAt: '10:00', closesAt: '00:00', isClosed: false },
        ],
      });
    const midnightDto = {
      eventType: 'Rodaje',
      eventDate: FRIDAY_DATE,
      startTime: '18:00',
      endTime: '23:00',
      guestCount: 50,
    };

    beforeEach(() => {
      mockVenueService.getVenueById.mockResolvedValue(midnightVenue());
      mockPriceCalculator.resolveUnitForDate.mockReturnValue('HOUR');
      mockBookingRepository.create.mockResolvedValue(makeBooking());
    });

    it('accepts a schedule that ends before midnight, within a venue open until 00:00', async () => {
      await expect(
        service.requestBooking('venue-1', 'client-1', midnightDto),
      ).resolves.toBeDefined();
    });

    it('accepts a schedule ending exactly at midnight', async () => {
      await expect(
        service.requestBooking('venue-1', 'client-1', { ...midnightDto, endTime: '00:00' }),
      ).resolves.toBeDefined();
    });

    it('still rejects a schedule starting before the venue opens', async () => {
      await expect(
        service.requestBooking('venue-1', 'client-1', { ...midnightDto, startTime: '08:00' }),
      ).rejects.toThrow(BadRequestException);
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
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());

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

  describe('markAsCompleted', () => {
    it('should mark a deposit-paid booking as completed', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.DEPOSIT_PAID }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.updateStatus.mockResolvedValue(
        makeBooking({ status: BookingStatus.COMPLETED }),
      );

      const result = await service.markAsCompleted('booking-1', 'owner-1', UserRole.OWNER);

      expect(result.status).toBe(BookingStatus.COMPLETED);
      expect(mockBookingRepository.updateStatus).toHaveBeenCalledWith(
        'booking-1',
        BookingStatus.COMPLETED,
      );
    });

    it('should throw BadRequestException when booking cannot be completed', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.PENDING }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());

      await expect(service.markAsCompleted('booking-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user cannot edit venue', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.DEPOSIT_PAID }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'other-owner' }));

      await expect(service.markAsCompleted('booking-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markAsNoShow', () => {
    it('should mark an approved booking as no show', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.APPROVED }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());
      mockBookingRepository.updateStatus.mockResolvedValue(
        makeBooking({ status: BookingStatus.NO_SHOW }),
      );

      const result = await service.markAsNoShow('booking-1', 'owner-1', UserRole.OWNER);

      expect(result.status).toBe(BookingStatus.NO_SHOW);
    });

    it.each([BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID])(
      'should mark a %s booking as no show (client paid but never showed up)',
      async (status) => {
        mockBookingRepository.findById.mockResolvedValue(makeBooking({ status }));
        mockVenueService.getVenueById.mockResolvedValue(makeVenue());
        mockBookingRepository.updateStatus.mockResolvedValue(
          makeBooking({ status: BookingStatus.NO_SHOW }),
        );

        const result = await service.markAsNoShow('booking-1', 'owner-1', UserRole.OWNER);

        expect(result.status).toBe(BookingStatus.NO_SHOW);
      },
    );

    it('should throw BadRequestException when booking is not approved', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.PENDING }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());

      await expect(service.markAsNoShow('booking-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user cannot edit venue', async () => {
      mockBookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.APPROVED }),
      );
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'other-owner' }));

      await expect(service.markAsNoShow('booking-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
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
        status: CalendarBlockStatus.BLOCKED,
      });

      const result = await service.createCalendarBlock(
        'venue-1',
        { date: new Date('2026-09-15'), status: CalendarBlockStatus.BLOCKED },
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
          { date: new Date('2026-09-15'), status: CalendarBlockStatus.BLOCKED },
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
          { date: new Date('2026-09-15'), status: CalendarBlockStatus.BLOCKED },
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
          { date: new Date('2026-09-15'), status: CalendarBlockStatus.BLOCKED },
          'owner-1',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a TENTATIVE block with a useTypeId that belongs to the venue\'s own "Ideal para"', async () => {
      mockVenueService.getVenueById.mockResolvedValue(
        makeVenue({
          uses: [
            {
              id: 'vu-1',
              useTypeId: 'use-wedding',
              useType: { id: 'use-wedding', key: 'WEDDING', name: 'Boda', icon: null },
              isPrimary: true,
            },
          ],
        }),
      );
      mockBookingRepository.isDateBlocked.mockResolvedValue(false);
      mockBookingRepository.hasConflict.mockResolvedValue(false);
      mockBookingRepository.createCalendarBlock.mockResolvedValue({
        id: 'block-2',
        venueId: 'venue-1',
        date: new Date('2026-09-15'),
        status: CalendarBlockStatus.TENTATIVE,
        useTypeId: 'use-wedding',
      });

      const result = await service.createCalendarBlock(
        'venue-1',
        {
          date: new Date('2026-09-15'),
          status: CalendarBlockStatus.TENTATIVE,
          useTypeId: 'use-wedding',
        },
        'owner-1',
        UserRole.OWNER,
      );

      expect(result.id).toBe('block-2');
      expect(mockBookingRepository.createCalendarBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          useTypeId: 'use-wedding',
          status: CalendarBlockStatus.TENTATIVE,
        }),
      );
    });

    it("rejects a useTypeId that isn't one of the venue's own use types", async () => {
      mockVenueService.getVenueById.mockResolvedValue(
        makeVenue({
          uses: [
            {
              id: 'vu-1',
              useTypeId: 'use-wedding',
              useType: { id: 'use-wedding', key: 'WEDDING', name: 'Boda', icon: null },
              isPrimary: true,
            },
          ],
        }),
      );
      mockBookingRepository.isDateBlocked.mockResolvedValue(false);
      mockBookingRepository.hasConflict.mockResolvedValue(false);

      await expect(
        service.createCalendarBlock(
          'venue-1',
          {
            date: new Date('2026-09-15'),
            status: CalendarBlockStatus.CONFIRMED,
            useTypeId: 'use-not-on-this-venue',
          },
          'owner-1',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockBookingRepository.createCalendarBlock).not.toHaveBeenCalled();
    });
  });

  describe('updateCalendarBlock', () => {
    it('updates status and useTypeId on an existing block owned by this venue', async () => {
      mockBookingRepository.findCalendarBlockById.mockResolvedValue({
        id: 'block-1',
        venueId: 'venue-1',
        date: new Date('2026-09-15'),
        status: CalendarBlockStatus.TENTATIVE,
      });
      mockVenueService.getVenueById.mockResolvedValue(
        makeVenue({
          uses: [
            {
              id: 'vu-1',
              useTypeId: 'use-wedding',
              useType: { id: 'use-wedding', key: 'WEDDING', name: 'Boda', icon: null },
              isPrimary: true,
            },
          ],
        }),
      );
      mockBookingRepository.updateCalendarBlock.mockResolvedValue({
        id: 'block-1',
        venueId: 'venue-1',
        date: new Date('2026-09-15'),
        status: CalendarBlockStatus.CONFIRMED,
        useTypeId: 'use-wedding',
      });

      const result = await service.updateCalendarBlock(
        'block-1',
        { status: CalendarBlockStatus.CONFIRMED, useTypeId: 'use-wedding' },
        'owner-1',
        UserRole.OWNER,
      );

      expect(result.status).toBe(CalendarBlockStatus.CONFIRMED);
      expect(mockBookingRepository.updateCalendarBlock).toHaveBeenCalledWith('block-1', {
        status: CalendarBlockStatus.CONFIRMED,
        useTypeId: 'use-wedding',
      });
    });

    it('throws NotFoundException when the block does not exist', async () => {
      mockBookingRepository.findCalendarBlockById.mockResolvedValue(null);

      await expect(
        service.updateCalendarBlock(
          'missing-block',
          { status: CalendarBlockStatus.BLOCKED },
          'owner-1',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockBookingRepository.updateCalendarBlock).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the caller does not own the venue', async () => {
      mockBookingRepository.findCalendarBlockById.mockResolvedValue({
        id: 'block-1',
        venueId: 'venue-1',
        date: new Date('2026-09-15'),
        status: CalendarBlockStatus.TENTATIVE,
      });
      mockVenueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'other-owner' }));

      await expect(
        service.updateCalendarBlock(
          'block-1',
          { status: CalendarBlockStatus.CONFIRMED },
          'owner-1',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockBookingRepository.updateCalendarBlock).not.toHaveBeenCalled();
    });

    it("rejects a useTypeId that isn't one of the venue's own use types", async () => {
      mockBookingRepository.findCalendarBlockById.mockResolvedValue({
        id: 'block-1',
        venueId: 'venue-1',
        date: new Date('2026-09-15'),
        status: CalendarBlockStatus.TENTATIVE,
      });
      mockVenueService.getVenueById.mockResolvedValue(
        makeVenue({
          uses: [
            {
              id: 'vu-1',
              useTypeId: 'use-wedding',
              useType: { id: 'use-wedding', key: 'WEDDING', name: 'Boda', icon: null },
              isPrimary: true,
            },
          ],
        }),
      );

      await expect(
        service.updateCalendarBlock(
          'block-1',
          { status: CalendarBlockStatus.CONFIRMED, useTypeId: 'use-not-on-this-venue' },
          'owner-1',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockBookingRepository.updateCalendarBlock).not.toHaveBeenCalled();
    });
  });

  describe('calendar', () => {
    beforeEach(() => {
      mockBookingRepository.findActiveByVenueInRange.mockResolvedValue([
        {
          bookingId: 'booking-1',
          date: new Date('2026-09-15T00:00:00.000Z'),
          status: 'APPROVED',
          eventType: 'Boda',
        },
        {
          bookingId: 'booking-2',
          date: new Date('2026-09-16T00:00:00.000Z'),
          status: 'PENDING',
          eventType: 'Cumpleanos',
        },
      ]);
      mockBookingRepository.getCalendarBlocks.mockResolvedValue([
        {
          id: 'block-1',
          date: new Date('2026-09-20T00:00:00.000Z'),
          status: CalendarBlockStatus.CONFIRMED,
          useTypeId: 'use-wedding',
          useType: { id: 'use-wedding', name: 'Boda' },
          reason: 'Boda de un familiar',
        },
      ]);
    });

    it('should only tell the public which days are taken and how firmly', async () => {
      const result = await service.getPublicCalendar(
        'venue-1',
        new Date('2026-09-01'),
        new Date('2026-09-30'),
      );

      expect(result.bookings).toEqual([
        { date: '2026-09-15', type: 'booking', status: 'CONFIRMED' },
        { date: '2026-09-16', type: 'booking', status: 'PENDING' },
      ]);
      expect(result.blocks).toEqual([
        { date: '2026-09-20', type: 'block', status: CalendarBlockStatus.CONFIRMED },
      ]);
    });

    it('should give the owner the details of each entry', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());

      const result = await service.getCalendarForManager(
        'venue-1',
        new Date('2026-09-01'),
        new Date('2026-09-30'),
        'owner-1',
        UserRole.OWNER,
      );

      expect(result.bookings[0]).toEqual({
        id: 'booking-1',
        date: '2026-09-15',
        type: 'booking',
        status: 'APPROVED',
        eventType: 'Boda',
      });
      expect(result.blocks).toEqual([
        {
          id: 'block-1',
          date: '2026-09-20',
          type: 'block',
          status: CalendarBlockStatus.CONFIRMED,
          useTypeId: 'use-wedding',
          useTypeName: 'Boda',
          reason: 'Boda de un familiar',
        },
      ]);
    });

    it('should not give another owner the details', async () => {
      mockVenueService.getVenueById.mockResolvedValue(makeVenue());

      await expect(
        service.getCalendarForManager(
          'venue-1',
          new Date('2026-09-01'),
          new Date('2026-09-30'),
          'other-owner',
          UserRole.OWNER,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockBookingRepository.findActiveByVenueInRange).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the range exceeds the max allowed days', async () => {
      await expect(
        service.getPublicCalendar('venue-1', new Date('2026-01-01'), new Date('2027-01-01')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      await expect(
        service.getPublicCalendar('venue-1', new Date('2026-09-30'), new Date('2026-09-01')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a date is invalid', async () => {
      await expect(
        service.getPublicCalendar('venue-1', new Date('not-a-date'), new Date('2026-09-30')),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('price preview of a venue that is not public', () => {
    const dto = {
      eventDate: toISODate(addDaysUTC(startOfTodayUTC(), 40)),
      startTime: '14:00',
      endTime: '20:00',
    };

    beforeEach(() => {
      mockVenueService.getVenueById.mockResolvedValue(
        makeVenue({ status: VenueStatus.DRAFT, isVerified: false }),
      );
    });

    it('should answer 404 to someone who only has the ID', async () => {
      await expect(service.previewPrice('venue-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('should accept the share-preview link of that venue', async () => {
      mockVenueService.getVenueByPreviewToken.mockResolvedValue(makeVenue());

      await expect(
        service.previewPrice('venue-1', { ...dto, previewToken: 'link-token' }),
      ).resolves.toBeDefined();
    });

    it('should reject the share-preview link of another venue', async () => {
      mockVenueService.getVenueByPreviewToken.mockResolvedValue(makeVenue({ id: 'venue-2' }));

      await expect(
        service.previewPrice('venue-1', { ...dto, previewToken: 'link-token' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should let its owner preview it', async () => {
      await expect(
        service.previewPriceForManager('venue-1', dto, 'owner-1', UserRole.OWNER),
      ).resolves.toBeDefined();
    });

    it('should not let another owner preview it', async () => {
      await expect(
        service.previewPriceForManager('venue-1', dto, 'other-owner', UserRole.OWNER),
      ).rejects.toThrow(ForbiddenException);
    });

    describe('with catalog items in the quote', () => {
      const selection = {
        ...dto,
        selectedRentalItems: [{ rentalItemId: 'silla', quantity: 2 }],
      };

      beforeEach(() => {
        mockVenueService.listActiveRentalItems.mockResolvedValue([
          {
            id: 'silla',
            name: 'Silla',
            unitLabel: 'unidad',
            pricePerUnit: 10,
            isIncluded: false,
            stockQty: 5,
            chargeBasis: 'PER_EVENT',
          },
        ]);
      });

      it('should add them through the share-preview link of that venue', async () => {
        mockVenueService.getVenueByPreviewToken.mockResolvedValue(makeVenue());

        const result = await service.previewPrice('venue-1', {
          ...selection,
          previewToken: 'link-token',
        });

        expect(result.rentalItemsTotal).toBe(20);
      });

      it('should add them for its owner', async () => {
        const result = await service.previewPriceForManager(
          'venue-1',
          selection,
          'owner-1',
          UserRole.OWNER,
        );

        expect(result.rentalItemsTotal).toBe(20);
      });

      it('should still answer 404 to someone who only has the ID', async () => {
        await expect(service.previewPrice('venue-1', selection)).rejects.toThrow(NotFoundException);
        expect(mockVenueService.listActiveRentalItems).not.toHaveBeenCalled();
      });
    });
  });

  describe('sendDueReminders', () => {
    const dueBooking = (overrides: Partial<BookingEntity> = {}) =>
      makeBooking({
        status: BookingStatus.APPROVED,
        client: { id: 'client-1', fullName: 'Test Client', email: 'client@email.com', phone: null },
        venue: {
          id: 'venue-1',
          name: 'Salon Test',
          slug: 'salon-test',
          photos: [],
          capacityMax: 200,
          paymentPolicy: PaymentPolicy.DEPOSIT_THEN_REMAINING,
        },
        ...overrides,
      });

    it('notifies and marks each reminder tier independently', async () => {
      mockBookingRepository.findBookingsDueForReminder.mockImplementation((_date, field) =>
        field === 'reminder7SentAt' ? Promise.resolve([dueBooking()]) : Promise.resolve([]),
      );

      const sentCount = await service.sendDueReminders();

      expect(sentCount).toBe(1);
      expect(mockNotificationService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'client-1', recipientEmail: 'client@email.com' }),
      );
      expect(mockBookingRepository.markReminderSent).toHaveBeenCalledWith(
        'booking-1',
        'reminder7SentAt',
      );
    });

    it('marks the reminder sent even when the client has no relation loaded', async () => {
      mockBookingRepository.findBookingsDueForReminder.mockImplementation((_date, field) =>
        field === 'reminder1SentAt'
          ? Promise.resolve([dueBooking({ client: undefined })])
          : Promise.resolve([]),
      );

      const sentCount = await service.sendDueReminders();

      expect(sentCount).toBe(1);
      expect(mockNotificationService.enqueue).not.toHaveBeenCalled();
      expect(mockBookingRepository.markReminderSent).toHaveBeenCalledWith(
        'booking-1',
        'reminder1SentAt',
      );
    });

    it('returns 0 when nothing is due', async () => {
      mockBookingRepository.findBookingsDueForReminder.mockResolvedValue([]);

      const sentCount = await service.sendDueReminders();

      expect(sentCount).toBe(0);
      expect(mockNotificationService.enqueue).not.toHaveBeenCalled();
      expect(mockBookingRepository.markReminderSent).not.toHaveBeenCalled();
    });

    it('queries all three reminder tiers', async () => {
      mockBookingRepository.findBookingsDueForReminder.mockResolvedValue([]);

      await service.sendDueReminders();

      const queriedFields = mockBookingRepository.findBookingsDueForReminder.mock.calls.map(
        (call) => call[1],
      );
      expect(queriedFields).toEqual(['reminder7SentAt', 'reminder3SentAt', 'reminder1SentAt']);
    });
  });

  describe('getPendingOwnerBookingsCount', () => {
    it('scopes to the requesting owner for OWNER role', async () => {
      mockBookingRepository.countPendingByOwner.mockResolvedValue(3);

      const count = await service.getPendingOwnerBookingsCount('owner-1', UserRole.OWNER);

      expect(count).toBe(3);
      expect(mockBookingRepository.countPendingByOwner).toHaveBeenCalledWith('owner-1');
      expect(mockBookingRepository.countAllPending).not.toHaveBeenCalled();
    });

    it('returns the platform-wide pending count for ADMIN role', async () => {
      mockBookingRepository.countAllPending.mockResolvedValue(11);

      const count = await service.getPendingOwnerBookingsCount('admin-1', UserRole.ADMIN);

      expect(count).toBe(11);
      expect(mockBookingRepository.countAllPending).toHaveBeenCalled();
      expect(mockBookingRepository.countPendingByOwner).not.toHaveBeenCalled();
    });
  });

  describe('getAllBookingsForAdmin', () => {
    it('returns a paginated result and forwards every filter', async () => {
      mockBookingRepository.findAllForAdmin.mockResolvedValue({
        items: [makeBooking()],
        total: 1,
      });

      const result = await service.getAllBookingsForAdmin({
        search: 'Salon',
        status: BookingStatus.APPROVED,
        venueId: 'venue-1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockBookingRepository.findAllForAdmin).toHaveBeenCalledWith({
        search: 'Salon',
        status: BookingStatus.APPROVED,
        venueId: 'venue-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        page: 1,
        limit: 20,
      });
    });

    it('leaves the date range undefined when no dates are given', async () => {
      mockBookingRepository.findAllForAdmin.mockResolvedValue({ items: [], total: 0 });

      await service.getAllBookingsForAdmin({ page: 1, limit: 20 });

      expect(mockBookingRepository.findAllForAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: undefined, endDate: undefined }),
      );
    });
  });
});
