import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
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
