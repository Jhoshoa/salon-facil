import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '../../../auth/domain/repositories/auth.repository.interface';
import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { ListUsersDto } from '../dto/list-users.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
  ) {}

  async listUsers(dto: ListUsersDto) {
    const { items, total } = await this.authRepository.findMany({
      search: dto.search,
      role: dto.role,
      status: dto.status,
      page: dto.page,
      limit: dto.limit,
    });

    return {
      data: items,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
    };
  }

  async updateUserStatus(
    userId: string,
    adminId: string,
    dto: UpdateUserStatusDto,
  ): Promise<UserEntity> {
    if (userId === adminId) {
      throw new BadRequestException('No podes cambiar tu propio estado');
    }

    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuario con ID '${userId}' no encontrado`);
    }

    this.logger.log(`Admin ${adminId} set user ${userId} status to ${dto.status}`);
    return this.authRepository.updateStatus(userId, dto.status);
  }
}
