import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationChannel } from '@prisma/client';
import { EmailService } from '../channels/email.service';
import { WhatsAppService } from '../channels/whatsapp.service';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories/notification.repository.interface';
import {
  NOTIFICATIONS_QUEUE,
  type NotificationJobData,
} from '../../application/services/notification.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId, channel, title, content, recipientEmail, recipientPhone } = job.data;

    const result =
      channel === NotificationChannel.WHATSAPP
        ? recipientPhone
          ? await this.whatsAppService.send(recipientPhone, `${title}\n\n${content}`)
          : { success: false, error: 'El destinatario no tiene telefono registrado' }
        : recipientEmail
          ? await this.emailService.send(recipientEmail, title, content)
          : { success: false, error: 'El destinatario no tiene email registrado' };

    if (result.success) {
      await this.notificationRepository.markAsSent(notificationId);
    } else {
      this.logger.warn(`Notification ${notificationId} not delivered: ${result.error}`);
      await this.notificationRepository.markAsFailed(
        notificationId,
        result.error ?? 'Error desconocido',
      );
    }
  }
}
