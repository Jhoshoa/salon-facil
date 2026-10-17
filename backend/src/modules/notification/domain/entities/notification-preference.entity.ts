import { NotificationChannel, NotificationType } from '@prisma/client';

/** The only types an owner/client can silence. Security and account-lifecycle notifications
 * (PASSWORD_RESET, EMAIL_VERIFICATION, ACCOUNT_LINKED, PASSWORD_CHANGED, WELCOME) are
 * deliberately excluded -- they always send regardless of preference. */
export const CONTROLLABLE_NOTIFICATION_TYPES: NotificationType[] = [
  NotificationType.BOOKING_REQUEST,
  NotificationType.BOOKING_CONFIRMED,
  NotificationType.BOOKING_CANCELLED,
  NotificationType.PAYMENT_RECEIVED,
  NotificationType.REMINDER_7_DAYS,
  NotificationType.REMINDER_3_DAYS,
  NotificationType.REMINDER_1_DAY,
  NotificationType.REVIEW_REQUEST,
  NotificationType.REVIEW_RESPONSE,
];

export const CONTROLLABLE_NOTIFICATION_CHANNELS: NotificationChannel[] = [
  NotificationChannel.EMAIL,
  NotificationChannel.WHATSAPP,
];

export class NotificationPreferenceEntity {
  id!: string;
  userId!: string;
  type!: NotificationType;
  channel!: NotificationChannel;
  enabled: boolean = true;
  updatedAt!: Date;

  constructor(partial: Partial<NotificationPreferenceEntity>) {
    Object.assign(this, partial);
  }
}
