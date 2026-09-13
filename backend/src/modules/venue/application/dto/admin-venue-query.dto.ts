import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { Departamento, VenueStatus } from '@prisma/client';

const toNumber = (value: unknown) => (value === '' || value == null ? undefined : Number(value));

export class AdminVenueQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(Departamento)
  departamento?: Departamento;

  @IsOptional()
  @IsEnum(VenueStatus)
  status?: VenueStatus;

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
