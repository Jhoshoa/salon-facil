import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { Public } from '../../../../shared/decorators/public.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { BookingService } from '../../application/services/booking.service';
import { CreateBookingDto, CheckAvailabilityDto } from '../../application/dto/booking.dto';

@ApiTags('Bookings')
@Controller('venues/:venueId/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva reserva (CLIENT)' })
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Fecha no disponible' })
  async create(
    @Param('venueId') venueId: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bookingService.requestBooking(venueId, user.id, {
      eventType: dto.eventType,
      eventDate: dto.eventDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      guestCount: dto.guestCount,
      specialRequests: dto.specialRequests,
    });
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener reservas de un local (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Lista de reservas del local' })
  async getVenueBookings(
    @Param('venueId') venueId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.bookingService.getVenueBookings(venueId, user.id, user.role);
  }

  @Get('availability')
  @Public()
  @ApiOperation({ summary: 'Verificar disponibilidad de un local en una fecha' })
  @ApiResponse({ status: 200, description: 'Resultado de disponibilidad' })
  async checkAvailability(@Param('venueId') venueId: string, @Query() query: CheckAvailabilityDto) {
    return this.bookingService.checkAvailability(venueId, new Date(query.date));
  }
}
