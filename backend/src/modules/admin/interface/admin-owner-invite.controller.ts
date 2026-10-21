import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../auth/domain/entities/user.entity';
import { AdminOwnerInviteService } from '../application/services/admin-owner-invite.service';
import { CreateOwnerInviteDto } from '../application/dto/create-owner-invite.dto';
import { AdminOwnerInviteQueryDto } from '../application/dto/admin-owner-invite-query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/owner-invites')
export class AdminOwnerInviteController {
  constructor(private readonly adminOwnerInviteService: AdminOwnerInviteService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Registrar un local por telefono: crea (o reusa) la cuenta del dueno y el local en DRAFT (ADMIN)',
  })
  @ApiResponse({ status: 201, description: 'Dueno y local creados' })
  @ApiResponse({ status: 400, description: 'El email pertenece a una cuenta de administrador' })
  async create(@Body() dto: CreateOwnerInviteDto, @CurrentUser('id') adminId: string) {
    return this.adminOwnerInviteService.createPlaceholderOwnerAndVenue(dto, adminId);
  }

  @Post(':venueId/send')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar (o reenviar) la invitacion de reclamo al dueno de un local (ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Invitacion enviada' })
  @ApiResponse({ status: 404, description: 'Local o propietario no encontrado' })
  async sendInvite(@Param('venueId') venueId: string, @CurrentUser('id') adminId: string) {
    return this.adminOwnerInviteService.sendInvite(venueId, adminId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar locales/duenos pendientes de reclamo (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Invitaciones pendientes, paginadas' })
  async list(@Query() dto: AdminOwnerInviteQueryDto) {
    return this.adminOwnerInviteService.listPendingInvites(dto);
  }
}
