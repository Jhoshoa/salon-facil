import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import {
  CreateNotificationData,
  INotificationRepository,
} from '../../domain/repositories/notification.repository.interface';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData): Promise<NotificationEntity> {
    const created = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        channel: data.channel,
        title: data.title,
        content: data.content,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    return this.toEntity(created);
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    return notification ? this.toEntity(notification) : null;
  }

  async findByUser(userId: string, limit = 30): Promise<NotificationEntity[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return notifications.map((n) => this.toEntity(n));
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(id: string): Promise<NotificationEntity> {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return this.toEntity(updated);
  }

  async markAsSent(id: string): Promise<NotificationEntity> {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { sentAt: new Date(), deliveredAt: new Date(), failedAt: null, errorMessage: null },
    });
    return this.toEntity(updated);
  }

  async markAsFailed(id: string, errorMessage: string): Promise<NotificationEntity> {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { failedAt: new Date(), errorMessage: errorMessage.slice(0, 500) },
    });
    return this.toEntity(updated);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntity(raw: any): NotificationEntity {
    return new NotificationEntity({
      id: raw.id,
      userId: raw.userId,
      type: raw.type,
      channel: raw.channel,
      title: raw.title,
      content: raw.content,
      isRead: raw.isRead,
      sentAt: raw.sentAt,
      deliveredAt: raw.deliveredAt,
      failedAt: raw.failedAt,
      errorMessage: raw.errorMessage,
      metadata: raw.metadata,
      createdAt: raw.createdAt,
    });
  }
}
