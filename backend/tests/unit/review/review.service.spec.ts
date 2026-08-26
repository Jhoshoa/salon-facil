import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from '../../../src/modules/review/application/services/review.service';
import {
  REVIEW_REPOSITORY,
  IReviewRepository,
} from '../../../src/modules/review/domain/repositories/review.repository.interface';
import { ReviewEntity } from '../../../src/modules/review/domain/entities/review.entity';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../../../src/modules/booking/domain/repositories/booking.repository.interface';
import { BookingEntity, BookingStatus } from '../../../src/modules/booking/domain/entities/booking.entity';
import { VenueService } from '../../../src/modules/venue/application/services/venue.service';
import { VenueEntity, VenueStatus } from '../../../src/modules/venue/domain/entities/venue.entity';
import { UserRole } from '../../../src/modules/auth/domain/entities/user.entity';
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
    depositPaid: true,
    status: BookingStatus.COMPLETED,
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

const makeReview = (overrides: Partial<ReviewEntity> = {}) =>
  new ReviewEntity({
    id: 'review-1',
    venueId: 'venue-1',
    clientId: 'client-1',
    bookingId: 'booking-1',
    rating: 5,
    comment: 'Excelente',
    isVerified: true,
    ownerResponse: null,
    ownerResponseAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    client: { id: 'client-1', fullName: 'Cliente Test', email: 'client@email.com' },
    ...overrides,
  });

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepository: jest.Mocked<IReviewRepository>;
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let venueService: { getVenueById: jest.Mock };
  let notificationService: { enqueue: jest.Mock };

  beforeEach(async () => {
    reviewRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByBookingId: jest.fn(),
      findByVenue: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      setOwnerResponse: jest.fn(),
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
    };

    venueService = { getVenueById: jest.fn() };
    notificationService = { enqueue: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: REVIEW_REPOSITORY, useValue: reviewRepository },
        { provide: BOOKING_REPOSITORY, useValue: bookingRepository },
        { provide: VenueService, useValue: venueService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  describe('createReview', () => {
    it('creates a review for a completed booking owned by the client', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking());
      reviewRepository.findByBookingId.mockResolvedValue(null);
      reviewRepository.create.mockResolvedValue(makeReview());

      const result = await service.createReview('booking-1', 'client-1', { rating: 5 });

      expect(result.id).toBe('review-1');
      expect(reviewRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ venueId: 'venue-1', clientId: 'client-1', bookingId: 'booking-1' }),
      );
    });

    it('rejects reviewing another client booking', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking({ clientId: 'other-client' }));

      await expect(
        service.createReview('booking-1', 'client-1', { rating: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects reviewing a non-completed booking', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking({ status: BookingStatus.APPROVED }));

      await expect(
        service.createReview('booking-1', 'client-1', { rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reviewing the same booking twice', async () => {
      bookingRepository.findById.mockResolvedValue(makeBooking());
      reviewRepository.findByBookingId.mockResolvedValue(makeReview());

      await expect(
        service.createReview('booking-1', 'client-1', { rating: 5 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateReview', () => {
    it('lets the author edit their review', async () => {
      reviewRepository.findById.mockResolvedValue(makeReview());
      reviewRepository.update.mockResolvedValue(makeReview({ rating: 4 }));

      const result = await service.updateReview('review-1', 'client-1', { rating: 4 });

      expect(result.rating).toBe(4);
      expect(reviewRepository.update).toHaveBeenCalledWith('review-1', {
        rating: 4,
        comment: undefined,
      });
    });

    it('rejects editing a review written by someone else', async () => {
      reviewRepository.findById.mockResolvedValue(makeReview({ clientId: 'other-client' }));

      await expect(
        service.updateReview('review-1', 'client-1', { rating: 4 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws not found for a missing review', async () => {
      reviewRepository.findById.mockResolvedValue(null);

      await expect(service.updateReview('missing', 'client-1', { rating: 4 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteReview', () => {
    it('lets the author delete their review', async () => {
      reviewRepository.findById.mockResolvedValue(makeReview());

      await service.deleteReview('review-1', 'client-1', UserRole.CLIENT);

      expect(reviewRepository.delete).toHaveBeenCalledWith('review-1');
    });

    it('lets an admin delete any review', async () => {
      reviewRepository.findById.mockResolvedValue(makeReview({ clientId: 'other-client' }));

      await service.deleteReview('review-1', 'admin-1', UserRole.ADMIN);

      expect(reviewRepository.delete).toHaveBeenCalledWith('review-1');
    });

    it('rejects deleting a review written by someone else', async () => {
      reviewRepository.findById.mockResolvedValue(makeReview({ clientId: 'other-client' }));

      await expect(
        service.deleteReview('review-1', 'client-1', UserRole.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('respondToReview', () => {
    it('lets the venue owner respond once', async () => {
      reviewRepository.findById.mockResolvedValue(makeReview());
      venueService.getVenueById.mockResolvedValue(makeVenue());
      reviewRepository.setOwnerResponse.mockResolvedValue(
        makeReview({ ownerResponse: 'Gracias!', ownerResponseAt: new Date() }),
      );

      const result = await service.respondToReview('review-1', 'owner-1', UserRole.OWNER, {
        response: 'Gracias!',
      });

      expect(result.ownerResponse).toBe('Gracias!');
      expect(notificationService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'client-1', recipientEmail: 'client@email.com' }),
      );
    });

    it('rejects a second response on the same review', async () => {
      reviewRepository.findById.mockResolvedValue(
        makeReview({ ownerResponse: 'Ya respondida', ownerResponseAt: new Date() }),
      );
      venueService.getVenueById.mockResolvedValue(makeVenue());

      await expect(
        service.respondToReview('review-1', 'owner-1', UserRole.OWNER, { response: 'Otra vez' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a response from someone who does not own the venue', async () => {
      reviewRepository.findById.mockResolvedValue(makeReview());
      venueService.getVenueById.mockResolvedValue(makeVenue({ ownerId: 'other-owner' }));

      await expect(
        service.respondToReview('review-1', 'owner-1', UserRole.OWNER, { response: 'Hola' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
