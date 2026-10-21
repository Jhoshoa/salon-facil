import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../auth/domain/entities/user.entity';
import { PaymentService } from '../application/services/payment.service';
import { AdminPaymentQueryDto } from '../application/dto/admin-payment-query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/payments')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar y buscar pagos de toda la plataforma, para resolver disputas (ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Pagos paginados, con la reserva y el local' })
  async list(@Query() dto: AdminPaymentQueryDto) {
    return this.paymentService.listPaymentsForAdmin(dto);
  }
}
