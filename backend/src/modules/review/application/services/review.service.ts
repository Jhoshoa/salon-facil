import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../../../booking/domain/repositories/booking.repository.interface';
import { BookingStatus } from '../../../booking/domain/entities/booking.entity';
import {
  IReviewRepository,
  REVIEW_REPOSITORY,
} from '../../domain/repositories/review.repository.interface';
import { CreateReviewDto } from '../dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviewRepository: IReviewRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: IBookingRepository,
  ) {}

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
}
