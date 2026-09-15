import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BookingModule } from '../../booking/interface/booking.module';
import { UploadModule } from '../../upload/upload.module';
import { VenueModule } from '../../venue/interface/venue.module';
import { NotificationModule } from '../../notification/interface/notification.module';
import { PaymentService } from '../application/services/payment.service';
import { PAYMENT_REPOSITORY } from '../domain/repositories/payment.repository.interface';
import { PAYMENT_GATEWAY } from '../domain/gateways/payment-gateway.interface';
import { PaymentRepository } from '../infrastructure/repositories/payment.repository';
import { ManualProofGateway } from '../infrastructure/gateways/manual-proof.gateway';
import { PaymentController } from './payment.controller';

@Module({
  imports: [PrismaModule, BookingModule, VenueModule, UploadModule, NotificationModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PaymentRepository,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: ManualProofGateway,
    },
  ],
  exports: [PaymentService, PAYMENT_REPOSITORY, PAYMENT_GATEWAY],
})
export class PaymentModule {}
