import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Length(6, 6, { message: 'El codigo debe tener 6 digitos' })
  code!: string;
}
