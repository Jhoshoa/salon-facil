import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { Public } from '../../../../shared/decorators/public.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { BookingService } from '../../application/services/booking.service';
import { CreateCalendarBlockDto } from '../../application/dto/booking.dto';

@ApiTags('Calendar')
@Controller('venues/:venueId/calendar')
export class CalendarController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener calendario publico de un local' })
  @ApiResponse({ status: 200, description: 'Calendario con reservas y bloqueos' })
  async getCalendar(
    @Param('venueId') venueId: string,
    @Query('month') month: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = this.resolveCalendarRange(month, startDate, endDate);
    return this.bookingService.getCalendar(venueId, start, end);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear bloqueo de calendario (OWNER/ADMIN)' })
  @ApiResponse({ status: 201, description: 'Bloqueo creado exitosamente' })
  @ApiResponse({ status: 409, description: 'La fecha ya está bloqueada o tiene reserva activa' })
  async createCalendarBlock(
    @Param('venueId') venueId: string,
    @Body() dto: CreateCalendarBlockDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.bookingService.createCalendarBlock(
      venueId,
      {
        date: new Date(dto.date),
        reason: dto.reason,
        isRecurring: dto.isRecurring,
        recurringRule: dto.recurringRule,
      },
      user.id,
      user.role,
    );
  }

  @Delete(':blockId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar bloqueo de calendario (OWNER/ADMIN)' })
  @ApiResponse({ status: 204, description: 'Bloqueo eliminado' })
  async deleteCalendarBlock(
    @Param('blockId') blockId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    await this.bookingService.deleteCalendarBlock(blockId, user.id, user.role);
  }

  private resolveCalendarRange(
    month?: string,
    startDate?: string,
    endDate?: string,
  ): { start: Date; end: Date } {
    if (month) {
      const [year, monthNumber] = month.split('-').map(Number);
      return {
        start: new Date(year, monthNumber - 1, 1),
        end: new Date(year, monthNumber, 0),
      };
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
}

@ApiTags('Calendar')
@Controller('calendar')
export class CalendarPublicController {
  constructor(private readonly bookingService: BookingService) {}

  @Get(':venueId')
  @Public()
  @ApiOperation({ summary: 'Obtener calendario publico de un local' })
  @ApiResponse({ status: 200, description: 'Calendario con reservas y bloqueos' })
  async getCalendar(
    @Param('venueId') venueId: string,
    @Query('month') month: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = resolveCalendarRange(month, startDate, endDate);
    return this.bookingService.getCalendar(venueId, start, end);
  }
}

function resolveCalendarRange(
  month?: string,
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } {
  if (month) {
    const [year, monthNumber] = month.split('-').map(Number);
    return {
      start: new Date(year, monthNumber - 1, 1),
      end: new Date(year, monthNumber, 0),
    };
  }

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { start, end };
}
