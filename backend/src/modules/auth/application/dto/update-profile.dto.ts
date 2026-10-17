import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

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
  @Matches(/^\+591\d{8}$/, {
    message: 'El teléfono debe ser válido de Bolivia (+591XXXXXXXX)',
  })
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

  // Only meaningful for Google-signup accounts still carrying the `pending:<id>` placeholder
  // phone — lets the "completa tu perfil" step set a real one. See
  // docs/auth-improvement/oauth-redirects-verification.md §1.
  @IsOptional()
  @Matches(/^\+591\d{8}$/, {
    message: 'El teléfono debe ser válido de Bolivia (+591XXXXXXXX)',
  })
  phone?: string;
}
