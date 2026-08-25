import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
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
import { PriceUnit } from '@prisma/client';

type Constructor<T extends object> = new () => T;

function parseJsonArray<T extends object>(value: unknown, dtoClass?: Constructor<T>): unknown {
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

  if (!dtoClass) {
    return parsedValue;
  }

  return parsedValue.map((item) => Object.assign(new dtoClass(), item));
}

// With enableImplicitConversion, class-transformer's built-in primitive conversion runs
// BEFORE this @Transform and coerces any non-empty string to `true` via `Boolean(value)`
// (e.g. `Boolean('false') === true`) — which breaks multipart/form-data bodies where every
// field arrives as a string. Read the untouched raw value from `obj` to parse it correctly.
function parseBoolean({ obj, key }: { obj: Record<string, unknown>; key: string }): unknown {
  const raw = obj[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  return raw;
}

export class CreateVenueServiceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isIncluded: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class CreateVenuePriceDto {
  @IsIn(['BASE', 'WEEKEND', 'HOLIDAY', 'CUSTOM_DATE', 'SEASON_HIGH', 'EARLY_BIRD'])
  priceType!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsDateString()
  specificDate?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsString()
  discountLabel?: string;
}

export class CreateVenueAmenityDto {
  @IsUUID()
  amenityId!: string;

  @IsOptional()
  @IsBoolean()
  isIncluded: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateVenueUseDto {
  @IsUUID()
  useTypeId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary: boolean = false;
}

export class CreateVenueOpeningHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'opensAt debe tener formato HH:mm' })
  opensAt?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'closesAt debe tener formato HH:mm' })
  closesAt?: string;

  @IsOptional()
  @IsBoolean()
  isClosed: boolean = false;
}

export class CreateVenueDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name!: string;

  @IsString()
  @MinLength(20, { message: 'La descripción debe tener al menos 20 caracteres' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  shortDescription?: string;

  @IsString()
  @MinLength(5)
  address!: string;

  @IsString()
  district!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsNumber()
  @Min(1)
  @Max(5000)
  capacityMax!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  squareMeters?: number;

  @IsOptional()
  @IsUUID()
  spaceTypeId?: string;

  @IsOptional()
  @IsIn(Object.values(PriceUnit))
  priceUnit?: PriceUnit;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  minimumHours?: number;

  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  instantBooking?: boolean;

  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  allowsMultipleDays?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || value.trim() === '') return value;
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : value;
    } catch {
      return value;
    }
  })
  photos?: string[];

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => parseJsonArray(value, CreateVenueServiceDto))
  @Type(() => CreateVenueServiceDto)
  services?: CreateVenueServiceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => parseJsonArray(value, CreateVenuePriceDto))
  @Type(() => CreateVenuePriceDto)
  prices?: CreateVenuePriceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => parseJsonArray(value, CreateVenueAmenityDto))
  @Type(() => CreateVenueAmenityDto)
  amenities?: CreateVenueAmenityDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => parseJsonArray(value, CreateVenueUseDto))
  @Type(() => CreateVenueUseDto)
  useTypes?: CreateVenueUseDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => parseJsonArray(value, CreateVenueOpeningHourDto))
  @Type(() => CreateVenueOpeningHourDto)
  openingHours?: CreateVenueOpeningHourDto[];
}
