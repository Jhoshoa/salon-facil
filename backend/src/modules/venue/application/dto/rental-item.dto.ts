import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
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
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { parseBoolean, parseIntOrNull, trimString, trimStringOrNull } from './create-venue.dto';

// Arrives as multipart/form-data (the photo travels alongside these fields in the same
// request), so every field lands as a string — the global ValidationPipe's
// `enableImplicitConversion` coerces numbers before validation runs, same as the rest of this
// module's DTOs (see create-venue.dto.ts). Booleans need the explicit `parseBoolean` transform
// instead, since implicit conversion's `Boolean(value)` would make the literal string "false"
// coerce to `true`.

// Keeps the value inside the database's 32-bit integer column.
export const MAX_RENTAL_SORT_ORDER = 100000;
export const MAX_REORDER_IDS = 1000;

/** An empty multipart field means "no price sent". Reads the raw value because implicit conversion
 * has already turned an empty string into 0, which would silently make the item free. */
function parseNumberOrUndefined({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}): unknown {
  const raw = obj[key];
  if (typeof raw !== 'string') return raw;
  return raw.trim() === '' ? undefined : Number(raw);
}

/** A blank unit means "keep the default or current one", never an empty label on the item. */
function trimStringOrUndefined({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() || undefined : value;
}

const PRICE_OPTIONS = { maxDecimalPlaces: 2 };
const PRICE_MESSAGE = 'El precio debe ser un numero con hasta 2 decimales';
const PRICE_RANGE_MESSAGE = 'El precio debe estar entre 0 y 999999.99';
const STOCK_MESSAGE = 'El stock debe ser un numero entero';
const STOCK_RANGE_MESSAGE = 'El stock debe estar entre 0 y 100000';
const NAME_LENGTH_MIN_MESSAGE = 'El nombre debe tener al menos 2 caracteres';
const NAME_LENGTH_MAX_MESSAGE = 'El nombre no puede superar los 120 caracteres';
const SORT_ORDER_MESSAGE = `El orden debe ser un entero entre 0 y ${MAX_RENTAL_SORT_ORDER}`;

export class CreateRentalItemDto {
  @Transform(trimString)
  @IsString({ message: 'El nombre es requerido' })
  @MinLength(2, { message: NAME_LENGTH_MIN_MESSAGE })
  @MaxLength(120, { message: NAME_LENGTH_MAX_MESSAGE })
  name!: string;

  @IsUUID(undefined, { message: 'La categoria no es valida' })
  categoryId!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Required unless the item comes included with the venue, which has no price to give.
  @ValidateIf((dto: CreateRentalItemDto) => !dto.isIncluded)
  @Transform(parseNumberOrUndefined)
  @IsNumber(PRICE_OPTIONS, { message: PRICE_MESSAGE })
  @Min(0, { message: PRICE_RANGE_MESSAGE })
  @Max(999999.99, { message: PRICE_RANGE_MESSAGE })
  pricePerUnit?: number;

  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  isIncluded?: boolean;

  @IsOptional()
  @Transform(trimStringOrUndefined)
  @IsString()
  @MaxLength(30, { message: 'La unidad no puede superar los 30 caracteres' })
  unitLabel?: string;

  @IsOptional()
  @Transform(parseIntOrNull)
  @IsInt({ message: STOCK_MESSAGE })
  @Min(0, { message: STOCK_RANGE_MESSAGE })
  @Max(100000, { message: STOCK_RANGE_MESSAGE })
  stockQty?: number | null;

  @IsOptional()
  @IsInt({ message: SORT_ORDER_MESSAGE })
  @Min(0, { message: SORT_ORDER_MESSAGE })
  @Max(MAX_RENTAL_SORT_ORDER, { message: SORT_ORDER_MESSAGE })
  sortOrder?: number;
}

export class UpdateRentalItemDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(2, { message: NAME_LENGTH_MIN_MESSAGE })
  @MaxLength(120, { message: NAME_LENGTH_MAX_MESSAGE })
  name?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'La categoria no es valida' })
  categoryId?: string;

  @IsOptional()
  @Transform(trimStringOrNull)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @Transform(parseNumberOrUndefined)
  @IsNumber(PRICE_OPTIONS, { message: PRICE_MESSAGE })
  @Min(0, { message: PRICE_RANGE_MESSAGE })
  @Max(999999.99, { message: PRICE_RANGE_MESSAGE })
  pricePerUnit?: number;

  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  isIncluded?: boolean;

  @IsOptional()
  @Transform(trimStringOrUndefined)
  @IsString()
  @MaxLength(30, { message: 'La unidad no puede superar los 30 caracteres' })
  unitLabel?: string;

  @IsOptional()
  @Transform(parseIntOrNull)
  @IsInt({ message: STOCK_MESSAGE })
  @Min(0, { message: STOCK_RANGE_MESSAGE })
  @Max(100000, { message: STOCK_RANGE_MESSAGE })
  stockQty?: number | null;

  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  isActive?: boolean;

  // Clears the current photo without uploading a replacement. Ignored if a new photo is also
  // sent in the same request -- the new upload wins.
  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  removePhoto?: boolean;

  @IsOptional()
  @IsInt({ message: SORT_ORDER_MESSAGE })
  @Min(0, { message: SORT_ORDER_MESSAGE })
  @Max(MAX_RENTAL_SORT_ORDER, { message: SORT_ORDER_MESSAGE })
  sortOrder?: number;
}

export class ReorderRentalItemsDto {
  @IsArray({ message: 'order debe ser un arreglo con los IDs de los items' })
  @ArrayNotEmpty({ message: 'order debe ser un arreglo con los IDs de los items' })
  @ArrayMaxSize(MAX_REORDER_IDS)
  @ArrayUnique({ message: 'order no puede repetir items' })
  @IsUUID(undefined, { each: true, message: 'order solo puede contener IDs validos' })
  order!: string[];
}
