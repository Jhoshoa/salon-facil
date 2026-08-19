import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BookingModule } from '../../booking/interface/booking.module';
import { UploadModule } from '../../upload/upload.module';
import { VenueModule } from '../../venue/interface/venue.module';
import { PaymentService } from '../application/services/payment.service';
import { PAYMENT_REPOSITORY } from '../domain/repositories/payment.repository.interface';
import { PaymentRepository } from '../infrastructure/repositories/payment.repository';
import { PaymentController } from './payment.controller';

@Module({
  imports: [PrismaModule, BookingModule, VenueModule, UploadModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PaymentRepository,
    },
  ],
  exports: [PaymentService, PAYMENT_REPOSITORY],
})
export class PaymentModule {}
