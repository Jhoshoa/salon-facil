import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyVenueDto {
  @IsBoolean()
  approve!: boolean;

  // Only meaningful when approve=false; the controller/service just ignore it otherwise. Not
  // required at this layer (a non-admin caller, e.g. a future automated check, might approve
  // without ever sending a reason) -- the admin UI is the one that enforces entering one before
  // it lets you reject.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
