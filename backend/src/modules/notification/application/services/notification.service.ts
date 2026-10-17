import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import {
  CONTROLLABLE_NOTIFICATION_TYPES,
  NotificationPreferenceEntity,
} from '../../domain/entities/notification-preference.entity';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories/notification.repository.interface';

export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NotificationJobData {
  notificationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  content: string;
  recipientEmail?: string;
  recipientPhone?: string;
  metadata?: Record<string, unknown>;
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

    // The in-app row above is created unconditionally (it's never spam — it's the user's own
    // history), but an opt-out skips the actual email/WhatsApp send. Only "controllable" types
    // are ever looked up here; security/account notifications always dispatch.
    if (CONTROLLABLE_NOTIFICATION_TYPES.includes(params.type)) {
      const channelEnabled = await this.notificationRepository.isChannelEnabled(
        params.userId,
        params.type,
        channel,
      );
      if (!channelEnabled) {
        this.logger.debug(
          `Notification ${notification.id} (${params.type}/${channel}) skipped: user opted out`,
        );
        return notification;
      }
    }

    try {
      await this.queue.add('send', {
        notificationId: notification.id,
        type: params.type,
        channel,
        title: params.title,
        content: params.content,
        recipientEmail: params.recipientEmail,
        recipientPhone: params.recipientPhone,
        metadata: params.metadata,
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

  /** Every controllable (type, channel) pair, each resolved to its effective enabled state --
   * true unless the user has an explicit opt-out row for it. Lets the settings UI render a
   * complete toggle grid without the frontend needing to know the opt-out-by-default model. */
  async getPreferences(userId: string): Promise<NotificationPreferenceEntity[]> {
    const existing = await this.notificationRepository.findPreferencesForUser(userId);
    const byKey = new Map(existing.map((p) => [`${p.type}:${p.channel}`, p]));

    return CONTROLLABLE_NOTIFICATION_TYPES.flatMap((type) =>
      [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP].map(
        (channel) =>
          byKey.get(`${type}:${channel}`) ??
          new NotificationPreferenceEntity({
            id: `${userId}:${type}:${channel}`,
            userId,
            type,
            channel,
            enabled: true,
            updatedAt: new Date(0),
          }),
      ),
    );
  }

  async setPreference(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreferenceEntity> {
    if (!CONTROLLABLE_NOTIFICATION_TYPES.includes(type)) {
      throw new BadRequestException(`'${type}' no es un tipo de notificacion controlable`);
    }
    return this.notificationRepository.setPreference(userId, type, channel, enabled);
  }
}
