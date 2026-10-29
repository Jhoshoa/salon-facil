import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { parseBoolean, trimString } from './create-venue.dto';

// Arrives as multipart/form-data (the photo travels alongside these fields in the same
// request), so every field lands as a string — the global ValidationPipe's
// `enableImplicitConversion` coerces numbers before validation runs, same as the rest of this
// module's DTOs (see create-venue.dto.ts). Booleans need the explicit `parseBoolean` transform
// instead, since implicit conversion's `Boolean(value)` would make the literal string "false"
// coerce to `true`.

export class CreateRentalItemDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(999999.99)
  pricePerUnit!: number;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(30)
  unitLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  stockQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRentalItemDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999.99)
  pricePerUnit?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(30)
  unitLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  stockQty?: number;

  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ReorderRentalItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  order!: string[];
}
