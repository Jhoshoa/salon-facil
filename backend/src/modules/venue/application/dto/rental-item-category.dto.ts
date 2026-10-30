import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { trimString } from './create-venue.dto';
import { MAX_RENTAL_SORT_ORDER, MAX_REORDER_IDS } from './rental-item.dto';

export class CreateRentalItemCategoryDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_RENTAL_SORT_ORDER)
  sortOrder?: number;
}

export class UpdateRentalItemCategoryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_RENTAL_SORT_ORDER)
  sortOrder?: number;
}

export class ReorderRentalItemCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_REORDER_IDS)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  order!: string[];
}
