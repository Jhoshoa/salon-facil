import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class OwnerResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  response!: string;
}
