import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../../../booking/domain/repositories/booking.repository.interface';
import { BookingStatus } from '../../../booking/domain/entities/booking.entity';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { VenueService } from '../../../venue/application/services/venue.service';
import { NotificationService } from '../../../notification/application/services/notification.service';
import {
  IReviewRepository,
  REVIEW_REPOSITORY,
} from '../../domain/repositories/review.repository.interface';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { OwnerResponseDto } from '../dto/owner-response.dto';

@Injectable()
export class ReviewService {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviewRepository: IReviewRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: IBookingRepository,
    private readonly venueService: VenueService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Fire-and-forget: a notification failing to send should never break the review flow
   * that triggered it (the row still lands in the recipient's in-app inbox either way). */
  private notify(params: Parameters<NotificationService['enqueue']>[0]): void {
    this.notificationService.enqueue(params).catch(() => {});
  }

  async createReview(bookingId: string, clientId: string, dto: CreateReviewDto) {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (booking.clientId !== clientId) {
      throw new ForbiddenException('No puedes calificar una reserva que no es tuya');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Solo puedes calificar reservas completadas');
    }

    const existing = await this.reviewRepository.findByBookingId(bookingId);
    if (existing) {
      throw new ConflictException('Ya calificaste esta reserva');
    }

    return this.reviewRepository.create({
      venueId: booking.venueId,
      clientId,
      bookingId,
      rating: dto.rating,
      comment: dto.comment,
    });
  }

  async getReviewByBooking(bookingId: string, clientId: string) {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (booking.clientId !== clientId) {
      throw new ForbiddenException('No puedes ver la calificacion de una reserva que no es tuya');
    }

    return this.reviewRepository.findByBookingId(bookingId);
  }

  async getVenueReviews(venueId: string, page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const { items, total } = await this.reviewRepository.findByVenue(venueId, safePage, safeLimit);

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async updateReview(reviewId: string, clientId: string, dto: UpdateReviewDto) {
    const review = await this.getReviewOrThrow(reviewId);

    if (!review.canBeEditedBy(clientId)) {
      throw new ForbiddenException('No puedes editar una resena que no escribiste');
    }

    return this.reviewRepository.update(reviewId, {
      rating: dto.rating,
      comment: dto.comment,
    });
  }

  async deleteReview(reviewId: string, userId: string, userRole: UserRole): Promise<void> {
    const review = await this.getReviewOrThrow(reviewId);

    if (!review.canBeEditedBy(userId) && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No puedes borrar una resena que no escribiste');
    }

    await this.reviewRepository.delete(reviewId);
  }

  async respondToReview(
    reviewId: string,
    ownerUserId: string,
    userRole: UserRole,
    dto: OwnerResponseDto,
  ) {
    const review = await this.getReviewOrThrow(reviewId);
    const venue = await this.venueService.getVenueById(review.venueId);

    if (!venue.canBeEditedBy(ownerUserId, userRole)) {
      throw new ForbiddenException('No tienes permiso para responder resenas de este local');
    }

    if (review.hasOwnerResponse()) {
      throw new BadRequestException('Esta resena ya tiene una respuesta');
    }

    const updated = await this.reviewRepository.setOwnerResponse(reviewId, dto.response);

    this.notify({
      userId: review.clientId,
      type: NotificationType.REVIEW_RESPONSE,
      title: `${venue.name} respondio tu resena`,
      content: dto.response,
      recipientEmail: review.client?.email,
    });

    return updated;
  }

  private async getReviewOrThrow(reviewId: string) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException(`Resena con ID '${reviewId}' no encontrada`);
    }
    return review;
  }
}
