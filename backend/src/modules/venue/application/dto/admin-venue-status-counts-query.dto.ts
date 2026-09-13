import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Departamento } from '@prisma/client';

// Deliberately excludes `status` (that's exactly what this endpoint breaks down) and
// page/limit (counting doesn't paginate) — kept separate from AdminVenueQueryDto so accepting
// those params here can't silently do nothing and confuse whoever's calling it.
export class AdminVenueStatusCountsQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(Departamento)
  departamento?: Departamento;
}
