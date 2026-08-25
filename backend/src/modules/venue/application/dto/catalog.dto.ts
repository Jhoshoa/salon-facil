import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AmenityCategory } from '@prisma/client';

/** Stable machine key, e.g. "EVENT_HALL". Uppercase snake_case by convention, not enforced. */
export class CreateCatalogItemDto {
  @IsString()
  @MinLength(2)
  key!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCatalogItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateAmenityDto extends CreateCatalogItemDto {
  @IsEnum(AmenityCategory)
  category!: AmenityCategory;
}

export class UpdateAmenityDto extends UpdateCatalogItemDto {
  @IsOptional()
  @IsEnum(AmenityCategory)
  category?: AmenityCategory;
}

/** Admin-maintained catalog of Bolivian holidays/high-demand seasons owners can apply as a
 * starting point for their own SEASON_HIGH price rules — see docs/fase-1 §3.3/§5.4. */
export class CreateSeasonalEventDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSeasonalEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
