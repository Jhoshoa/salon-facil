import { IsEmail, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVenueDto } from '../../../venue/application/dto/create-venue.dto';

export class OwnerInviteContactDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100)
  fullName!: string;

  @IsEmail({}, { message: 'Email invalido' })
  email!: string;

  @Matches(/^\+591\d{8}$/, {
    message: 'El telefono debe ser valido de Bolivia (+591XXXXXXXX)',
  })
  phone!: string;
}

/** Body for the admin phone-onboarding endpoint: the owner's contact info (as collected over
 * the call) plus the venue itself. Reuses CreateVenueDto as-is rather than a trimmed-down copy
 * -- its required fields (name, address, district, departamento, capacityMax) are exactly what
 * a call realistically yields; everything else (photos, amenities, hours) gets filled in
 * afterward through the normal venue-edit screens, which the admin already has access to. */
export class CreateOwnerInviteDto {
  @ValidateNested()
  @Type(() => OwnerInviteContactDto)
  owner!: OwnerInviteContactDto;

  @ValidateNested()
  @Type(() => CreateVenueDto)
  venue!: CreateVenueDto;
}
