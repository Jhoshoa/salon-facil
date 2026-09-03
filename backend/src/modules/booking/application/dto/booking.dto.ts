import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BookingStatus } from '../../domain/entities/booking.entity';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `dailySchedule` arrives as a real array in a JSON POST body, but as a JSON-encoded
 * string in GET query params (preview-price) — parse it back into an array either way. */
function parseDailyScheduleArray(value: unknown): unknown {
  let parsedValue = value;

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      parsedValue = JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  if (!Array.isArray(parsedValue)) {
    return value;
  }

  return parsedValue.map((item) => Object.assign(new DailyScheduleEntryDto(), item));
}

/** `selectedAmenityIds` arrives as a real array in a JSON POST body, but as a single
 * comma-separated string in GET query params (preview-price). */
function parseIdArray(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return value;
}

/** Horario para un dia especifico del rango cuya unidad efectiva resulto ser HOUR. */
export class DailyScheduleEntryDto {
  @IsDateString({}, { message: 'La fecha del horario debe ser valida' })
  date!: string;

  @IsString({ message: 'La hora de inicio es requerida' })
  @Matches(TIME_PATTERN, { message: 'La hora de inicio debe tener formato HH:MM' })
  startTime!: string;

  @IsString({ message: 'La hora de fin es requerida' })
  @Matches(TIME_PATTERN, { message: 'La hora de fin debe tener formato HH:MM' })
  endTime!: string;
}

export class CreateBookingDto {
  @IsString({ message: 'El tipo de evento es requerido' })
  @IsNotEmpty({ message: 'El tipo de evento es requerido' })
  @MinLength(2)
  @MaxLength(100)
  eventType!: string;

  @IsDateString({}, { message: 'La fecha del evento debe ser una fecha valida' })
  eventDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha valida' })
  endDate?: string;

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

  @IsOptional()
  @Transform(({ value }) => parseDailyScheduleArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyScheduleEntryDto)
  dailySchedule?: DailyScheduleEntryDto[];

  @IsOptional()
  @Transform(({ value }) => parseIdArray(value))
  @IsArray()
  @IsUUID('4', { each: true })
  selectedAmenityIds?: string[];
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

export class CheckAvailabilityRangeDto {
  @IsDateString({}, { message: 'La fecha de inicio debe ser valida' })
  startDate!: string;

  @IsDateString({}, { message: 'La fecha de fin debe ser valida' })
  endDate!: string;
}

export class PreviewPriceDto {
  @IsDateString({}, { message: 'La fecha del evento debe ser una fecha valida' })
  eventDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha valida' })
  endDate?: string;

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

  @IsOptional()
  @Transform(({ value }) => parseDailyScheduleArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyScheduleEntryDto)
  dailySchedule?: DailyScheduleEntryDto[];

  @IsOptional()
  @Transform(({ value }) => parseIdArray(value))
  @IsArray()
  @IsUUID('4', { each: true })
  selectedAmenityIds?: string[];
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
