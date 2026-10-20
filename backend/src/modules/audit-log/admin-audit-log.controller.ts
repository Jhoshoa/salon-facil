import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../auth/domain/entities/user.entity';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/audit-log')
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Historial de acciones de administradores (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Entradas del log paginadas' })
  async list(@Query() dto: AuditLogQueryDto) {
    const { items, total } = await this.auditLogService.findMany(dto);
    return {
      data: items,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
    };
  }
}
