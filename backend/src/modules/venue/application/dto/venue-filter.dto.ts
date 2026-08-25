import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PriceUnit } from '@prisma/client';

export enum SortField {
  FEATURED = 'featured',
  PRICE = 'price',
  PRICE_ASC = 'priceAsc',
  PRICE_DESC = 'priceDesc',
  CAPACITY = 'capacity',
  CAPACITY_DESC = 'capacityDesc',
  RATING = 'rating',
  RATING_DESC = 'ratingDesc',
  CREATED_AT = 'createdAt',
  NEWEST = 'newest',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase());
  return Boolean(value);
};

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const values = Array.isArray(value) ? value : String(value).split(',');
  return values.map((item) => String(item).trim()).filter(Boolean);
};

export class VenueFilterDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  services?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  @Transform(({ value }) => toNumber(value))
  guestCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  @Transform(({ value }) => toNumber(value))
  minCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  @Transform(({ value }) => toNumber(value))
  maxCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => toNumber(value))
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => toNumber(value))
  maxPrice?: number;

  @IsOptional()
  @IsEnum(PriceUnit)
  priceUnit?: PriceUnit;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toStringArray(value))
  spaceTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toStringArray(value))
  useTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => toStringArray(value))
  amenities?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  hasParking?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => toNumber(value))
  parkingCapacity?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  hasCatering?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  allowsAlcohol?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  allowsExternalCatering?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  instantBooking?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  north?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  south?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  east?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => toNumber(value))
  west?: number;

  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => toNumber(value))
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => toNumber(value))
  limit?: number;
}
