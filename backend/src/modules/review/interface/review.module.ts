import { Module } from '@nestjs/common';
import {
  VenueReviewController,
  BookingReviewController,
  ReviewController,
} from './review.controller';
import { ReviewService } from '../application/services/review.service';
import { ReviewRepository } from '../infrastructure/repositories/review.repository';
import { REVIEW_REPOSITORY } from '../domain/repositories/review.repository.interface';
import { BookingModule } from '../../booking/interface/booking.module';
import { VenueModule } from '../../venue/interface/venue.module';
import { NotificationModule } from '../../notification/interface/notification.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, BookingModule, VenueModule, NotificationModule],
  controllers: [VenueReviewController, BookingReviewController, ReviewController],
  providers: [
    ReviewService,
    {
      provide: REVIEW_REPOSITORY,
      useClass: ReviewRepository,
    },
  ],
})
export class ReviewModule {}
