import { NotificationChannel, NotificationType } from '@prisma/client';

export class NotificationEntity {
  id!: string;
  userId!: string;
  type!: NotificationType;
  channel!: NotificationChannel;
  title!: string;
  content!: string;
  isRead: boolean = false;
  sentAt: Date | null = null;
  deliveredAt: Date | null = null;
  failedAt: Date | null = null;
  errorMessage: string | null = null;
  metadata: Record<string, unknown> | null = null;
  createdAt!: Date;

  constructor(partial: Partial<NotificationEntity>) {
    Object.assign(this, partial);
  }
}
