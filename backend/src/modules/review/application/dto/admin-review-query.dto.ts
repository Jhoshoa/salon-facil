import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// NestJS's global ValidationPipe runs with `transformOptions: { enableImplicitConversion: true }`
// (see main.ts). For a `boolean`-typed property, class-transformer's implicit conversion runs
// BEFORE a @Transform callback sees the value, coercing via generic JS `Boolean(value)` --
// meaning the query string "false" (a non-empty string) is already coerced to `true` by the time
// our transform runs, which then sees an already-boolean `true` and passes it straight through.
// The fix is to bypass the pre-converted `value` and read the untouched raw string ourselves via
// `obj[key]`.
const toBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase());
  return Boolean(value);
};

export class AdminReviewQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ obj, key }) => toBoolean(obj[key]))
  hasResponse?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
