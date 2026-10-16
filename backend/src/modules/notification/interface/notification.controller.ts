import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { NotificationService } from '../application/services/notification.service';
import { UpdateNotificationPreferenceDto } from '../application/dto/update-notification-preference.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mis notificaciones (mas recientes primero)' })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones del usuario' })
  async list(@CurrentUser() user: { id: string }) {
    return this.notificationService.listForUser(user.id);
  }

  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cantidad de notificaciones no leidas' })
  @ApiResponse({ status: 200, description: 'Numero de notificaciones sin leer' })
  async unreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.notificationService.countUnread(user.id);
    return { count };
  }

  @Get('preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mis preferencias de notificacion (tipo x canal)' })
  @ApiResponse({ status: 200, description: 'Preferencias de notificacion del usuario' })
  async getPreferences(@CurrentUser() user: { id: string }) {
    return this.notificationService.getPreferences(user.id);
  }

  @Put('preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar o desactivar un tipo de notificacion para un canal' })
  @ApiResponse({ status: 200, description: 'Preferencia actualizada' })
  async setPreference(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationService.setPreference(user.id, dto.type, dto.channel, dto.enabled);
  }

  @Put(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar una notificacion como leida' })
  @ApiResponse({ status: 200, description: 'Notificacion actualizada' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const notification = await this.notificationService.getById(id);
    if (!notification) {
      throw new NotFoundException(`Notificacion con ID '${id}' no encontrada`);
    }
    if (notification.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para modificar esta notificacion');
    }
    return this.notificationService.markAsRead(id);
  }
}
