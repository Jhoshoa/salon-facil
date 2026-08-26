import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationController } from './notification.controller';
import {
  NotificationService,
  NOTIFICATIONS_QUEUE,
} from '../application/services/notification.service';
import { NotificationProcessor } from '../infrastructure/queue/notification.processor';
import { NotificationRepository } from '../infrastructure/repositories/notification.repository';
import { NOTIFICATION_REPOSITORY } from '../domain/repositories/notification.repository.interface';
import { EmailService } from '../infrastructure/channels/email.service';
import { WhatsAppService } from '../infrastructure/channels/whatsapp.service';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationProcessor,
    EmailService,
    WhatsAppService,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: NotificationRepository,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
