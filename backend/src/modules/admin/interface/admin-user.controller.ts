import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserEntity, UserRole } from '../../auth/domain/entities/user.entity';
import { VenueEntity } from '../../venue/domain/entities/venue.entity';
import { BookingEntity } from '../../booking/domain/entities/booking.entity';
import { AdminUserService } from '../application/services/admin-user.service';
import { ListUsersDto } from '../application/dto/list-users.dto';
import { UpdateUserStatusDto } from '../application/dto/update-user-status.dto';
import { UpdateUserRoleDto } from '../application/dto/update-user-role.dto';
import { UserCountsQueryDto } from '../application/dto/user-counts-query.dto';

const toAdminUserDto = (user: UserEntity) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  fullName: user.fullName,
  role: user.role,
  status: user.status,
  city: user.city,
  district: user.district,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
});

const toAdminUserVenueSummaryDto = (venue: VenueEntity) => ({
  id: venue.id,
  name: venue.name,
  slug: venue.slug,
  status: venue.status,
  district: venue.district,
  departamento: venue.departamento,
  createdAt: venue.createdAt,
});

const toAdminUserBookingSummaryDto = (booking: BookingEntity) => ({
  id: booking.id,
  venueId: booking.venueId,
  venueName: booking.venue?.name ?? null,
  eventDate: booking.eventDate,
  status: booking.status,
  totalPrice: booking.totalPrice,
  createdAt: booking.createdAt,
});

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar y buscar usuarios (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Usuarios paginados' })
  async list(@Query() dto: ListUsersDto) {
    const result = await this.adminUserService.listUsers(dto);
    return { ...result, data: result.data.map(toAdminUserDto) };
  }

  @Get('counts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cantidad de usuarios por rol y por estado, respetando busqueda y filtros (ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Conteo por UserRole y por UserStatus' })
  async getCounts(@Query() dto: UserCountsQueryDto) {
    return this.adminUserService.getUserCounts(dto);
  }

  @Get(':userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Detalle de un usuario: datos de cuenta y sus locales o reservas (ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Usuario con sus locales (OWNER) o reservas (CLIENT)' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getDetail(@Param('userId') userId: string) {
    const { user, venues, bookings } = await this.adminUserService.getUserDetail(userId);
    return {
      user: toAdminUserDto(user),
      venues: venues?.map(toAdminUserVenueSummaryDto),
      bookings: bookings?.map(toAdminUserBookingSummaryDto),
    };
  }

  @Put(':userId/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspender o reactivar un usuario (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  async updateStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: { id: string },
  ) {
    const user = await this.adminUserService.updateUserStatus(userId, admin.id, dto);
    return toAdminUserDto(user);
  }

  @Put(':userId/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar el rol de un usuario entre CLIENT y OWNER (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  async updateRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() admin: { id: string },
  ) {
    const user = await this.adminUserService.updateUserRole(userId, admin.id, dto);
    return toAdminUserDto(user);
  }
}
