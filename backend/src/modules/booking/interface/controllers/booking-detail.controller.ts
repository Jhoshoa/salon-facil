import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { Public } from '../../../../shared/decorators/public.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { BookingService } from '../../application/services/booking.service';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingDetailController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('availability')
  @Public()
  @ApiOperation({ summary: 'Verificar disponibilidad de fecha' })
  @ApiResponse({ status: 200, description: 'Resultado de disponibilidad' })
  async checkAvailability(@Query('venueId') venueId: string, @Query('date') date: string) {
    return this.bookingService.checkAvailability(venueId, new Date(date));
  }

  @Get('my')
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis reservas (CLIENT)' })
  @ApiResponse({ status: 200, description: 'Lista de reservas del cliente' })
  async getMyBookings(@CurrentUser() user: { id: string }) {
    return this.bookingService.getMyBookings(user.id);
  }

  @Get('my-bookings')
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis reservas (CLIENT)' })
  @ApiResponse({ status: 200, description: 'Lista de reservas del cliente' })
  async getMyBookingsAlias(@CurrentUser() user: { id: string }) {
    return this.bookingService.getMyBookings(user.id);
  }

  @Get('owner/pending-count')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Contar reservas pendientes de mis locales (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Cantidad de reservas pendientes' })
  async getPendingOwnerBookingsCount(@CurrentUser() user: { id: string; role: UserRole }) {
    const count = await this.bookingService.getPendingOwnerBookingsCount(user.id, user.role);
    return { count };
  }

  @Get(':id')
  @Roles(UserRole.CLIENT, UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener reserva por ID' })
  @ApiResponse({ status: 200, description: 'Reserva encontrada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async getById(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.bookingService.getBookingById(id, user.id, user.role);
  }

  @Put(':id/cancel')
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar reserva (CLIENT)' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada' })
  @ApiResponse({ status: 403, description: 'No es tu reserva' })
  async cancelByClient(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.bookingService.cancelBookingByClient(id, user.id);
  }

  @Put(':id/approve')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aprobar reserva (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Reserva aprobada' })
  @ApiResponse({ status: 400, description: 'La reserva no puede ser aprobada' })
  async approve(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.bookingService.approveBooking(id, user.id, user.role);
  }

  @Put(':id/reject')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechazar reserva (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Reserva rechazada' })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Body('reason') reason?: string,
  ) {
    return this.bookingService.rejectBooking(id, user.id, user.role, reason);
  }

  @Put(':id/deposit-paid')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar seña pagada (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Seña registrada' })
  async markDepositPaid(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.bookingService.markDepositPaid(id, user.id, user.role);
  }

  @Put(':id/complete')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar reserva como completada (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Reserva completada' })
  @ApiResponse({ status: 400, description: 'La reserva no puede ser completada' })
  async markAsCompleted(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.bookingService.markAsCompleted(id, user.id, user.role);
  }

  @Put(':id/no-show')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar reserva como no show (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Reserva marcada como no show' })
  async markAsNoShow(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.bookingService.markAsNoShow(id, user.id, user.role);
  }
}
