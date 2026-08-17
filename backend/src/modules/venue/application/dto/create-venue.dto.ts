import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

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
}
