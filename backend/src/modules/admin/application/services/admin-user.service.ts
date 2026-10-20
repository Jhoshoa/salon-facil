import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '../../../auth/domain/repositories/auth.repository.interface';
import { UserEntity, UserRole, UserStatus } from '../../../auth/domain/entities/user.entity';
import {
  VENUE_REPOSITORY,
  IVenueRepository,
} from '../../../venue/domain/repositories/venue.repository.interface';
import { VenueEntity } from '../../../venue/domain/entities/venue.entity';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../../../booking/domain/repositories/booking.repository.interface';
import { BookingEntity } from '../../../booking/domain/entities/booking.entity';
import { ListUsersDto } from '../dto/list-users.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { UserCountsQueryDto } from '../dto/user-counts-query.dto';

export interface AdminUserDetail {
  user: UserEntity;
  // Only one of these is ever populated, depending on the user's role -- a CLIENT has bookings
  // but no venues, an OWNER has venues but (today) no bookings of their own, and an ADMIN has
  // neither. `undefined` (not an empty array) distinguishes "not applicable for this role" from
  // "applicable, but zero so far".
  venues?: VenueEntity[];
  bookings?: BookingEntity[];
}

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: IVenueRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
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

  async updateUserRole(
    userId: string,
    adminId: string,
    dto: UpdateUserRoleDto,
  ): Promise<UserEntity> {
    if (userId === adminId) {
      throw new BadRequestException('No podes cambiar tu propio rol');
    }

    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuario con ID '${userId}' no encontrado`);
    }

    this.logger.log(`Admin ${adminId} set user ${userId} role to ${dto.role}`);
    return this.authRepository.updateRole(userId, dto.role);
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuario con ID '${userId}' no encontrado`);
    }

    if (user.role === UserRole.OWNER) {
      const venues = await this.venueRepository.findByOwner(userId);
      return { user, venues };
    }

    if (user.role === UserRole.CLIENT) {
      const bookings = await this.bookingRepository.findByClient(userId);
      return { user, bookings };
    }

    return { user };
  }

  async getUserCounts(
    dto: UserCountsQueryDto,
  ): Promise<{ role: Record<UserRole, number>; status: Record<UserStatus, number> }> {
    const [role, status] = await Promise.all([
      this.authRepository.countByRole({ search: dto.search, status: dto.status }),
      this.authRepository.countByStatus({ search: dto.search, role: dto.role }),
    ]);
    return { role, status };
  }
}
