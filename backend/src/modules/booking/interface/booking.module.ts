import { Module } from '@nestjs/common';
import { BookingController } from './controllers/booking.controller';
import { BookingDetailController } from './controllers/booking-detail.controller';
import { CalendarController, CalendarPublicController } from './controllers/calendar.controller';
import { BookingService } from '../application/services/booking.service';
import { PriceCalculatorService } from '../application/services/price-calculator.service';
import { AvailabilityService } from '../application/services/availability.service';
import { BookingRepository } from '../infrastructure/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '../domain/repositories/booking.repository.interface';
import { VenueModule } from '../../venue/interface/venue.module';
import { NotificationModule } from '../../notification/interface/notification.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, VenueModule, NotificationModule],
  controllers: [
    BookingController,
    BookingDetailController,
    CalendarController,
    CalendarPublicController,
  ],
  providers: [
    BookingService,
    PriceCalculatorService,
    AvailabilityService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
  ],
  exports: [BookingService, BOOKING_REPOSITORY],
})
export class BookingModule {}
