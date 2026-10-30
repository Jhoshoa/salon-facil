import { AmenityCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { trimString } from './create-venue.dto';

const MAX_AMENITIES = 100;
const MAX_CUSTOM_FEATURES = 20;

export class VenueCustomFeatureDto {
  @Transform(trimString)
  @IsString({ message: 'El nombre de la caracteristica es requerido' })
  @MinLength(2, { message: 'Cada caracteristica debe tener al menos 2 caracteres' })
  @MaxLength(60, { message: 'Cada caracteristica puede tener hasta 60 caracteres' })
  name!: string;

  @IsEnum(AmenityCategory, { message: 'La categoria no es valida' })
  category!: AmenityCategory;
}

export class UpdateVenueFeaturesDto {
  @IsArray()
  @ArrayMaxSize(MAX_AMENITIES)
  @ArrayUnique()
  @IsUUID(undefined, { each: true, message: 'Una de las caracteristicas no es valida' })
  amenityIds!: string[];

  @IsArray()
  @ArrayMaxSize(MAX_CUSTOM_FEATURES, {
    message: `Puedes agregar hasta ${MAX_CUSTOM_FEATURES} caracteristicas propias`,
  })
  @ValidateNested({ each: true })
  @Type(() => VenueCustomFeatureDto)
  customFeatures!: VenueCustomFeatureDto[];
}
