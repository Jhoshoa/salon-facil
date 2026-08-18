import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BookingStatus } from '../../domain/entities/booking.entity';

export class CreateBookingDto {
  @IsString({ message: 'El tipo de evento es requerido' })
  @IsNotEmpty({ message: 'El tipo de evento es requerido' })
  @MinLength(2)
  @MaxLength(100)
  eventType!: string;

  @IsDateString({}, { message: 'La fecha del evento debe ser una fecha valida' })
  eventDate!: string;

  @IsString({ message: 'La hora de inicio es requerida' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de inicio debe tener formato HH:MM',
  })
  startTime!: string;

  @IsString({ message: 'La hora de fin es requerida' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de fin debe tener formato HH:MM',
  })
  endTime!: string;

  @IsInt({ message: 'El numero de invitados debe ser un entero' })
  @Min(1, { message: 'Debe haber al menos 1 invitado' })
  @Max(5000, { message: 'El numero de invitados no puede exceder 5000' })
  guestCount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialRequests?: string;
}

export class CheckAvailabilityDto {
  @IsDateString({}, { message: 'La fecha debe ser valida' })
  date!: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus, { message: 'Estado no valido' })
  status!: BookingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateCalendarBlockDto {
  @IsDateString({}, { message: 'La fecha debe ser valida' })
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsObject()
  recurringRule?: Record<string, unknown>;
}
