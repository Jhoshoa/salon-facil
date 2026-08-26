import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories/notification.repository.interface';

export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NotificationJobData {
  notificationId: string;
  channel: NotificationChannel;
  title: string;
  content: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

export interface EnqueueNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  /** Defaults to EMAIL — WHATSAPP requires the recipient's number and a Twilio sandbox
   * opt-in per number, so it's opt-in per call rather than a blanket default. */
  channel?: NotificationChannel;
  recipientEmail?: string;
  recipientPhone?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJobData>,
  ) {}

  /** Persists the notification immediately (so it shows up in the recipient's inbox right
   * away) and queues the actual send as a background job — callers (booking/payment flows)
   * never wait on, or fail because of, an email/WhatsApp provider being slow or down. */
  async enqueue(params: EnqueueNotificationParams): Promise<NotificationEntity> {
    const channel = params.channel ?? NotificationChannel.EMAIL;

    const notification = await this.notificationRepository.create({
      userId: params.userId,
      type: params.type,
      channel,
      title: params.title,
      content: params.content,
      metadata: params.metadata,
    });

    try {
      await this.queue.add('send', {
        notificationId: notification.id,
        channel,
        title: params.title,
        content: params.content,
        recipientEmail: params.recipientEmail,
        recipientPhone: params.recipientPhone,
      });
    } catch (error) {
      // Queueing failure (e.g. Redis briefly unreachable) shouldn't break the booking/payment
      // flow that triggered this — the notification row still exists for the in-app inbox,
      // it just won't be emailed/WhatsApp'd. Mark it so that's visible instead of silent.
      const message = error instanceof Error ? error.message : 'No se pudo encolar el envio';
      this.logger.error(`Failed to enqueue notification ${notification.id}: ${message}`);
      await this.notificationRepository.markAsFailed(notification.id, message);
    }

    return notification;
  }

  async listForUser(userId: string): Promise<NotificationEntity[]> {
    return this.notificationRepository.findByUser(userId);
  }

  async getById(id: string): Promise<NotificationEntity | null> {
    return this.notificationRepository.findById(id);
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  async markAsRead(id: string): Promise<NotificationEntity> {
    return this.notificationRepository.markAsRead(id);
  }
}
