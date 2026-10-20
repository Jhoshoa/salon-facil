import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { BookingService } from '../../application/services/booking.service';
import { AdminBookingQueryDto } from '../../application/dto/admin-booking-query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/bookings')
export class AdminBookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar y buscar reservas de toda la plataforma (ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Reservas paginadas, con el local y el cliente' })
  async list(@Query() dto: AdminBookingQueryDto) {
    return this.bookingService.getAllBookingsForAdmin(dto);
  }
}
