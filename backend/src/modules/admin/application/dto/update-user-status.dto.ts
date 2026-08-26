import { IsEnum } from 'class-validator';
import { UserStatus } from '../../../auth/domain/entities/user.entity';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}
