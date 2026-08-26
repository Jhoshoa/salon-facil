import { NotificationChannel, NotificationType } from '@prisma/client';
import { NotificationEntity } from '../entities/notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface INotificationRepository {
  create(data: CreateNotificationData): Promise<NotificationEntity>;
  findById(id: string): Promise<NotificationEntity | null>;
  findByUser(userId: string, limit?: number): Promise<NotificationEntity[]>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string): Promise<NotificationEntity>;
  markAsSent(id: string): Promise<NotificationEntity>;
  markAsFailed(id: string, errorMessage: string): Promise<NotificationEntity>;
}
