import { IsIn } from 'class-validator';
import { UserRole } from '../../../auth/domain/entities/user.entity';

export class UpdateUserRoleDto {
  // Deliberately excludes ADMIN: granting admin access is a higher-stakes action than flipping
  // someone between CLIENT/OWNER, and shouldn't be one dropdown option away in a generic endpoint.
  @IsIn([UserRole.CLIENT, UserRole.OWNER], { message: 'El rol debe ser CLIENT o OWNER' })
  role!: UserRole;
}
