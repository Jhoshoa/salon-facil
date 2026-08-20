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
  let venueService: { getVenueById: jest.Mock };
  let cloudinaryService: { uploadImage: jest.Mock };

  beforeEach(async () => {
    paymentRepository = {
      findById: jest.fn(),
      findByBooking: jest.fn(),
      findByClient: jest.fn(),
      findPendingByOwner: jest.fn(),
      create: jest.fn(),
      uploadProof: jest.fn(),
      confirm: jest.fn(),
      reject: jest.fn(),
    };

    bookingRepository = {
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

    venueService = {
      getVenueById: jest.fn(),
    };

    cloudinaryService = {
      uploadImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PAYMENT_REPOSITORY, useValue: paymentRepository },
        { provide: BOOKING_REPOSITORY, useValue: bookingRepository },
        { provide: VenueService, useValue: venueService },
        { provide: CloudinaryService, useValue: cloudinaryService },
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
});
