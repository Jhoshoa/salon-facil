import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl debe ser una URL valida' })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappPhone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'facebookUrl debe ser una URL valida' })
  facebookUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'instagramUrl debe ser una URL valida' })
  instagramUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'tiktokUrl debe ser una URL valida' })
  tiktokUrl?: string;
}
