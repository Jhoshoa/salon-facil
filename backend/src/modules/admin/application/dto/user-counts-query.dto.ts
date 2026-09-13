import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole, UserStatus } from '../../../auth/domain/entities/user.entity';

// Deliberately excludes page/limit -- counting doesn't paginate. Both role and status are
// accepted together: the role breakdown respects `search` + `status` (never `role` itself,
// that's what it's counting) and the status breakdown respects `search` + `role` (never
// `status` itself) -- see AdminUserService.getUserCounts.
export class UserCountsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
