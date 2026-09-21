import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import {
  buildNotificationEmailHtml,
  type NotificationEmailMetadata,
} from '../templates/notification-email.templates';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const {
      notificationId,
      type,
      channel,
      title,
      content,
      recipientEmail,
      recipientPhone,
      metadata,
    } = job.data;

    const result =
      channel === NotificationChannel.WHATSAPP
        ? recipientPhone
          ? await this.whatsAppService.send(recipientPhone, `${title}\n\n${content}`)
          : { success: false, error: 'El destinatario no tiene telefono registrado' }
        : recipientEmail
          ? await this.emailService.send(
              recipientEmail,
              title,
              content,
              buildNotificationEmailHtml(
                type,
                title,
                metadata as NotificationEmailMetadata | undefined,
                this.config.get<string>('FRONTEND_URL', 'http://localhost:3000'),
              ) ?? undefined,
            )
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
