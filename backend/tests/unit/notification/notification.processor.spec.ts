import { Job } from 'bullmq';
import { NotificationChannel } from '@prisma/client';
import { NotificationProcessor } from '../../../src/modules/notification/infrastructure/queue/notification.processor';
import type { INotificationRepository } from '../../../src/modules/notification/domain/repositories/notification.repository.interface';
import type { EmailService } from '../../../src/modules/notification/infrastructure/channels/email.service';
import type { WhatsAppService } from '../../../src/modules/notification/infrastructure/channels/whatsapp.service';
import type { NotificationJobData } from '../../../src/modules/notification/application/services/notification.service';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let repository: jest.Mocked<INotificationRepository>;
  let emailService: jest.Mocked<Pick<EmailService, 'send'>>;
  let whatsAppService: jest.Mocked<Pick<WhatsAppService, 'send'>>;

  const makeJob = (data: Partial<NotificationJobData> = {}): Job<NotificationJobData> =>
    ({
      data: {
        notificationId: 'notif-1',
        channel: NotificationChannel.EMAIL,
        title: 'Titulo',
        content: 'Contenido',
        recipientEmail: 'client@test.com',
        ...data,
      },
    }) as Job<NotificationJobData>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAsSent: jest.fn(),
      markAsFailed: jest.fn(),
    };
    emailService = { send: jest.fn() };
    whatsAppService = { send: jest.fn() };

    processor = new NotificationProcessor(
      repository,
      emailService as unknown as EmailService,
      whatsAppService as unknown as WhatsAppService,
    );
  });

  it('sends via email and marks the notification as sent on success', async () => {
    emailService.send.mockResolvedValue({ success: true });

    await processor.process(makeJob());

    expect(emailService.send).toHaveBeenCalledWith('client@test.com', 'Titulo', 'Contenido');
    expect(repository.markAsSent).toHaveBeenCalledWith('notif-1');
    expect(repository.markAsFailed).not.toHaveBeenCalled();
  });

  it('sends via whatsapp when the channel is WHATSAPP', async () => {
    whatsAppService.send.mockResolvedValue({ success: true });

    await processor.process(
      makeJob({ channel: NotificationChannel.WHATSAPP, recipientPhone: '+59171234567' }),
    );

    expect(whatsAppService.send).toHaveBeenCalledWith('+59171234567', 'Titulo\n\nContenido');
    expect(repository.markAsSent).toHaveBeenCalledWith('notif-1');
  });

  it('marks the notification failed when the channel send fails', async () => {
    emailService.send.mockResolvedValue({ success: false, error: 'Resend no configurado' });

    await processor.process(makeJob());

    expect(repository.markAsFailed).toHaveBeenCalledWith('notif-1', 'Resend no configurado');
    expect(repository.markAsSent).not.toHaveBeenCalled();
  });

  it('marks failed without ever calling a channel when the recipient contact is missing', async () => {
    await processor.process(makeJob({ recipientEmail: undefined }));

    expect(emailService.send).not.toHaveBeenCalled();
    expect(repository.markAsFailed).toHaveBeenCalledWith(
      'notif-1',
      'El destinatario no tiene email registrado',
    );
  });
});
