import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const toNumber = (value: unknown) => (value === '' || value == null ? undefined : Number(value));

export class AdminVenueQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => toNumber(value))
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => toNumber(value))
  limit?: number;
}
