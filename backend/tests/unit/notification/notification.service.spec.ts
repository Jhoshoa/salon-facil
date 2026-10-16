import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationChannel, NotificationType } from '@prisma/client';
import {
  NotificationService,
  NOTIFICATIONS_QUEUE,
} from '../../../src/modules/notification/application/services/notification.service';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../src/modules/notification/domain/repositories/notification.repository.interface';
import { NotificationEntity } from '../../../src/modules/notification/domain/entities/notification.entity';

const makeNotification = (overrides: Partial<NotificationEntity> = {}) =>
  new NotificationEntity({
    id: 'notif-1',
    userId: 'user-1',
    type: NotificationType.BOOKING_REQUEST,
    channel: NotificationChannel.EMAIL,
    title: 'Titulo',
    content: 'Contenido',
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  });

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: jest.Mocked<INotificationRepository>;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAsSent: jest.fn(),
      markAsFailed: jest.fn(),
      findPreferencesForUser: jest.fn(),
      isChannelEnabled: jest.fn().mockResolvedValue(true),
      setPreference: jest.fn(),
    };

    queue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NOTIFICATION_REPOSITORY, useValue: repository },
        { provide: getQueueToken(NOTIFICATIONS_QUEUE), useValue: queue },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('enqueue', () => {
    it('persists the notification and queues the send job', async () => {
      repository.create.mockResolvedValue(makeNotification());

      const result = await service.enqueue({
        userId: 'user-1',
        type: NotificationType.BOOKING_REQUEST,
        title: 'Nueva solicitud',
        content: 'Detalle',
        recipientEmail: 'client@test.com',
      });

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: NotificationType.BOOKING_REQUEST,
        channel: NotificationChannel.EMAIL,
        title: 'Nueva solicitud',
        content: 'Detalle',
        metadata: undefined,
      });
      expect(queue.add).toHaveBeenCalledWith('send', {
        notificationId: 'notif-1',
        type: NotificationType.BOOKING_REQUEST,
        channel: NotificationChannel.EMAIL,
        title: 'Nueva solicitud',
        content: 'Detalle',
        recipientEmail: 'client@test.com',
        recipientPhone: undefined,
        metadata: undefined,
      });
      expect(result.id).toBe('notif-1');
    });

    it('defaults to EMAIL when no channel is given', async () => {
      repository.create.mockResolvedValue(makeNotification());

      await service.enqueue({
        userId: 'user-1',
        type: NotificationType.WELCOME,
        title: 'Bienvenido',
        content: 'Contenido',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: NotificationChannel.EMAIL }),
      );
    });

    it('respects an explicit WHATSAPP channel', async () => {
      repository.create.mockResolvedValue(
        makeNotification({ channel: NotificationChannel.WHATSAPP }),
      );

      await service.enqueue({
        userId: 'user-1',
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Confirmada',
        content: 'Contenido',
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: '+59171234567',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: NotificationChannel.WHATSAPP }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'send',
        expect.objectContaining({ recipientPhone: '+59171234567' }),
      );
    });

    it('marks the notification failed (but still returns it) when queueing itself fails', async () => {
      repository.create.mockResolvedValue(makeNotification());
      queue.add.mockRejectedValue(new Error('Redis unreachable'));

      const result = await service.enqueue({
        userId: 'user-1',
        type: NotificationType.WELCOME,
        title: 'Bienvenido',
        content: 'Contenido',
      });

      expect(repository.markAsFailed).toHaveBeenCalledWith('notif-1', 'Redis unreachable');
      expect(result.id).toBe('notif-1');
    });

    it('still creates the in-app notification but skips queueing when the user opted out of this type/channel', async () => {
      repository.create.mockResolvedValue(makeNotification());
      repository.isChannelEnabled.mockResolvedValue(false);

      const result = await service.enqueue({
        userId: 'user-1',
        type: NotificationType.BOOKING_REQUEST,
        title: 'Nueva solicitud',
        content: 'Detalle',
        recipientEmail: 'client@test.com',
      });

      expect(repository.isChannelEnabled).toHaveBeenCalledWith(
        'user-1',
        NotificationType.BOOKING_REQUEST,
        NotificationChannel.EMAIL,
      );
      expect(repository.create).toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
      expect(result.id).toBe('notif-1');
    });

    it('never checks preferences for a non-controllable (security/account) type', async () => {
      repository.create.mockResolvedValue(makeNotification({ type: NotificationType.WELCOME }));

      await service.enqueue({
        userId: 'user-1',
        type: NotificationType.WELCOME,
        title: 'Bienvenido',
        content: 'Contenido',
      });

      expect(repository.isChannelEnabled).not.toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('fills in every controllable type/channel pair, defaulting to enabled when no row exists', async () => {
      repository.findPreferencesForUser.mockResolvedValue([]);

      const result = await service.getPreferences('user-1');

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((p) => p.enabled)).toBe(true);
      expect(
        result.some(
          (p) =>
            p.type === NotificationType.BOOKING_REQUEST &&
            p.channel === NotificationChannel.WHATSAPP,
        ),
      ).toBe(true);
    });
  });

  describe('setPreference', () => {
    it('delegates to the repository for a controllable type', async () => {
      repository.setPreference.mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        type: NotificationType.BOOKING_REQUEST,
        channel: NotificationChannel.EMAIL,
        enabled: false,
        updatedAt: new Date(),
      });

      const result = await service.setPreference(
        'user-1',
        NotificationType.BOOKING_REQUEST,
        NotificationChannel.EMAIL,
        false,
      );

      expect(result.enabled).toBe(false);
      expect(repository.setPreference).toHaveBeenCalledWith(
        'user-1',
        NotificationType.BOOKING_REQUEST,
        NotificationChannel.EMAIL,
        false,
      );
    });

    it('rejects a non-controllable type (no silencing PASSWORD_RESET etc.)', async () => {
      await expect(
        service.setPreference(
          'user-1',
          NotificationType.PASSWORD_RESET,
          NotificationChannel.EMAIL,
          false,
        ),
      ).rejects.toThrow();
      expect(repository.setPreference).not.toHaveBeenCalled();
    });
  });

  describe('listForUser / countUnread / markAsRead', () => {
    it('delegates to the repository', async () => {
      repository.findByUser.mockResolvedValue([makeNotification()]);
      repository.countUnread.mockResolvedValue(3);
      repository.markAsRead.mockResolvedValue(makeNotification({ isRead: true }));

      const list = await service.listForUser('user-1');
      const count = await service.countUnread('user-1');
      const read = await service.markAsRead('notif-1');

      expect(list).toHaveLength(1);
      expect(count).toBe(3);
      expect(read.isRead).toBe(true);
      expect(repository.findByUser).toHaveBeenCalledWith('user-1');
      expect(repository.countUnread).toHaveBeenCalledWith('user-1');
      expect(repository.markAsRead).toHaveBeenCalledWith('notif-1');
    });
  });
});
