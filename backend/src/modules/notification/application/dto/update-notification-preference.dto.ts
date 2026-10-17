import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationChannel, NotificationType } from '@prisma/client';

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}
