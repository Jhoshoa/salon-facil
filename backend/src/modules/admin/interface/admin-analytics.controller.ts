import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../auth/domain/entities/user.entity';
import { AdminAnalyticsService } from '../application/services/admin-analytics.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Metricas generales de la plataforma (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Resumen, series de tiempo y top locales' })
  async getDashboard() {
    return this.adminAnalyticsService.getDashboard();
  }
}
