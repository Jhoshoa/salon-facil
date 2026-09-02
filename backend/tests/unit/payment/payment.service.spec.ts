import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../../../src/modules/payment/application/services/payment.service';
import {
  PAYMENT_REPOSITORY,
  IPaymentRepository,
} from '../../../src/modules/payment/domain/repositories/payment.repository.interface';
import {
  PaymentEntity,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../../../src/modules/payment/domain/entities/payment.entity';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../../../src/modules/booking/domain/repositories/booking.repository.interface';
import {
  BookingEntity,
  BookingStatus,
} from '../../../src/modules/booking/domain/entities/booking.entity';
import { VenueService } from '../../../src/modules/venue/application/services/venue.service';
import { VenueEntity, VenueStatus } from '../../../src/modules/venue/domain/entities/venue.entity';
import { UserRole } from '../../../src/modules/auth/domain/entities/user.entity';
import { CloudinaryService } from '../../../src/modules/upload/cloudinary.service';
import { NotificationService } from '../../../src/modules/notification/application/services/notification.service';

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
    status: BookingStatus.APPROVED,
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
    description: 'Test venue',
    address: 'Calle 1',
    district: 'Distrito 1',
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

const makePayment = (overrides: Partial<PaymentEntity> = {}) =>
  new PaymentEntity({
    id: 'payment-1',
    bookingId: 'booking-1',
    amount: 1500,
    paymentType: PaymentType.DEPOSIT,
    method: PaymentMethod.BANK_TRANSFER,
    status: PaymentStatus.PENDING,
    comprobanteUrl: 'https://example.com/proof.jpg',
    createdAt: new Date(),
    booking: {
      id: 'booking-1',
      venueId: 'venue-1',
      clientId: 'client-1',
      eventType: 'Boda',
      eventDate: new Date('2026-09-15'),
      totalPrice: 5000,
      depositAmount: 1500,
      depositPaid: false,
      status: BookingStatus.APPROVED,
      venue: {
        id: 'venue-1',
        name: 'Salon Test',
        slug: 'salon-test',
        ownerId: 'owner-1',
      },
    },
    ...overrides,
  });

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: jest.Mocked<IPaymentRepository>;
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let venueService: { getVenueById: jest.Mock; getOwnerContact: jest.Mock };
  let cloudinaryService: { uploadImage: jest.Mock };
  let notificationService: { enqueue: jest.Mock };

  beforeEach(async () => {
    paymentRepository = {
      findById: jest.fn(),
      findByBooking: jest.fn(),
      findByClient: jest.fn(),
      findPendingByOwner: jest.fn(),
      findAllPending: jest.fn(),
      create: jest.fn(),
      uploadProof: jest.fn(),
      confirm: jest.fn(),
      reject: jest.fn(),
      getOwnerEarningsSummary: jest.fn(),
      getOwnerEarningsByVenueAndMonth: jest.fn(),
    };

    bookingRepository = {
      findById: jest.fn(),
      findByVenueAndDate: jest.fn(),
      findByClient: jest.fn(),
      findByVenue: jest.fn(),
      findActiveByVenueInRange: jest.fn(),
      findBookedDatesInRange: jest.fn(),
      findByVenueAndStatus: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      markDepositPaid: jest.fn(),
      hasConflict: jest.fn(),
      deleteBookingDatesByBookingId: jest.fn(),
      createCalendarBlock: jest.fn(),
      getCalendarBlocks: jest.fn(),
      findCalendarBlockById: jest.fn(),
      deleteCalendarBlock: jest.fn(),
      isDateBlocked: jest.fn(),
      countByVenueAndStatus: jest.fn(),
      incrementVenueBookingCount: jest.fn(),
      findBookingsDueForReminder: jest.fn(),
      markReminderSent: jest.fn(),
    };

    venueService = {
      getVenueById: jest.fn(),
      getOwnerContact: jest.fn().mockResolvedValue(null),
    };

    cloudinaryService = {
      uploadImage: jest.fn(),
    };

    notificationService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PAYMENT_REPOSITORY, useValue: paymentRepository },
        { provide: BOOKING_REPOSITORY, useValue: bookingRepository },
        { provide: VenueService, useValue: venueService },
        { provide: CloudinaryService, useValue: cloudinaryService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(PaymentService);
  });

  describe('createPayment', () => {
    it('creates a deposit payment for the booking client', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking());
      paymentRepository.create.mockResolvedValue(makePayment());

      const result = await service.createPayment('booking-1', 'client-1', {
        paymentType: PaymentType.DEPOSIT,
        method: PaymentMethod.BANK_TRANSFER,
        amount: 1500,
      });

      expect(result.id).toBe('payment-1');
      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ bookingId: 'booking-1', amount: 1500 }),
      );
    });

    it('rejects payment creation for another client booking', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking({ clientId: 'other-client' }));

      await expect(
        service.createPayment('booking-1', 'client-1', {
          paymentType: PaymentType.DEPOSIT,
          method: PaymentMethod.BANK_TRANSFER,
          amount: 1500,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancelled bookings', async () => {
      bookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.CANCELLED_BY_CLIENT }),
      );

      await expect(
        service.createPayment('booking-1', 'client-1', {
          paymentType: PaymentType.DEPOSIT,
          method: PaymentMethod.BANK_TRANSFER,
          amount: 1500,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects deposit amount mismatches', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking());

      await expect(
        service.createPayment('booking-1', 'client-1', {
          paymentType: PaymentType.DEPOSIT,
          method: PaymentMethod.BANK_TRANSFER,
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a full payment for exactly the booking total', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking());
      paymentRepository.create.mockResolvedValue(
        makePayment({ paymentType: PaymentType.FULL, amount: 5000 }),
      );

      await service.createPayment('booking-1', 'client-1', {
        paymentType: PaymentType.FULL,
        method: PaymentMethod.QR_BANK,
        amount: 5000,
      });

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000 }),
      );
    });

    it('rejects a full payment for less than the booking total', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking());

      await expect(
        service.createPayment('booking-1', 'client-1', {
          paymentType: PaymentType.FULL,
          method: PaymentMethod.QR_BANK,
          amount: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a remaining payment for totalPrice minus depositAmount', async () => {
      bookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.DEPOSIT_PAID, depositPaid: true }),
      );
      paymentRepository.create.mockResolvedValue(
        makePayment({ paymentType: PaymentType.REMAINING, amount: 3500 }),
      );

      await service.createPayment('booking-1', 'client-1', {
        paymentType: PaymentType.REMAINING,
        method: PaymentMethod.CASH,
        amount: 3500,
      });

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 3500 }),
      );
    });

    it('rejects a remaining payment that does not match totalPrice minus depositAmount', async () => {
      bookingRepository.findById.mockResolvedValue(
        makeBooking({ status: BookingStatus.DEPOSIT_PAID, depositPaid: true }),
      );

      await expect(
        service.createPayment('booking-1', 'client-1', {
          paymentType: PaymentType.REMAINING,
          method: PaymentMethod.CASH,
          amount: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmPayment', () => {
    it('confirms a pending payment for venue owner', async () => {
      paymentRepository.findById.mockResolvedValue(makePayment());
      venueService.getVenueById.mockResolvedValue(makeVenue());
      paymentRepository.confirm.mockResolvedValue(
        makePayment({ status: PaymentStatus.COMPLETED, confirmedByOwnerId: 'owner-1' }),
      );

      const result = await service.confirmPayment('payment-1', 'owner-1', UserRole.OWNER, 'ok');

      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(paymentRepository.confirm).toHaveBeenCalledWith('payment-1', 'owner-1', 'ok');
    });

    it('rejects confirmation from another owner', async () => {
      paymentRepository.findById.mockResolvedValue(makePayment());
      venueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'other-owner' }));

      await expect(service.confirmPayment('payment-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('requires proof before confirmation', async () => {
      paymentRepository.findById.mockResolvedValue(makePayment({ comprobanteUrl: null }));

      await expect(service.confirmPayment('payment-1', 'owner-1', UserRole.OWNER)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getBookingPayments', () => {
    it('throws not found for missing booking', async () => {
      bookingRepository.findById.mockResolvedValue(null);

      await expect(
        service.getBookingPayments('missing', 'client-1', UserRole.CLIENT),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingOwnerPayments', () => {
    it('scopes to the requesting owner for OWNER role', async () => {
      paymentRepository.findPendingByOwner.mockResolvedValue([]);

      await service.getPendingOwnerPayments('owner-1', UserRole.OWNER);

      expect(paymentRepository.findPendingByOwner).toHaveBeenCalledWith('owner-1');
      expect(paymentRepository.findAllPending).not.toHaveBeenCalled();
    });

    it('returns the platform-wide pending queue for ADMIN role', async () => {
      paymentRepository.findAllPending.mockResolvedValue([]);

      await service.getPendingOwnerPayments('admin-1', UserRole.ADMIN);

      expect(paymentRepository.findAllPending).toHaveBeenCalled();
      expect(paymentRepository.findPendingByOwner).not.toHaveBeenCalled();
    });
  });

  describe('getOwnerEarnings', () => {
    it('combines the summary and the monthly breakdown for the owner', async () => {
      paymentRepository.getOwnerEarningsSummary.mockResolvedValue({
        totalEarned: 4500,
        paymentCount: 3,
      });
      paymentRepository.getOwnerEarningsByVenueAndMonth.mockResolvedValue([
        {
          venueId: 'venue-1',
          venueName: 'Salon Test',
          month: new Date('2026-08-01'),
          total: 4500,
          count: 3,
        },
      ]);

      const result = await service.getOwnerEarnings('owner-1', 6);

      expect(result.summary).toEqual({ totalEarned: 4500, paymentCount: 3 });
      expect(result.breakdown).toHaveLength(1);
      expect(paymentRepository.getOwnerEarningsSummary).toHaveBeenCalledWith('owner-1');
      expect(paymentRepository.getOwnerEarningsByVenueAndMonth).toHaveBeenCalledWith('owner-1', 6);
    });

    it('defaults to a 6-month lookback', async () => {
      paymentRepository.getOwnerEarningsSummary.mockResolvedValue({
        totalEarned: 0,
        paymentCount: 0,
      });
      paymentRepository.getOwnerEarningsByVenueAndMonth.mockResolvedValue([]);

      await service.getOwnerEarnings('owner-1');

      expect(paymentRepository.getOwnerEarningsByVenueAndMonth).toHaveBeenCalledWith('owner-1', 6);
    });
  });
});
