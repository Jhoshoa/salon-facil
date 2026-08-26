import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserEntity, UserRole } from '../../auth/domain/entities/user.entity';
import { AdminUserService } from '../application/services/admin-user.service';
import { ListUsersDto } from '../application/dto/list-users.dto';
import { UpdateUserStatusDto } from '../application/dto/update-user-status.dto';

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
}
