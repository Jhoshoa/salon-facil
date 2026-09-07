import { Injectable } from '@nestjs/common';
import { Prisma, User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IAuthRepository,
  UserIdentityRecord,
} from '../../domain/repositories/auth.repository.interface';
import { UserEntity, UserRole, UserStatus } from '../../domain/entities/user.entity';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toEntity(user) : null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    return user ? this.toEntity(user) : null;
  }

  async create(data: {
    email: string;
    phone: string;
    passwordHash?: string;
    fullName: string;
    role: string;
    city?: string;
    district?: string;
    emailVerifiedAt?: Date;
  }): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash ?? null,
        fullName: data.fullName,
        role: data.role as UserRole,
        // Account-lifecycle status (can this user use the platform at all) is deliberately
        // independent of email-verification status (emailVerifiedAt / isVerified()) — the
        // former is an admin-controlled lever, the latter gates specific trust/money actions.
        // See docs/auth-improvement/oauth-redirects-verification.md §4.
        status: UserStatus.ACTIVE,
        city: data.city ?? null,
        district: data.district ?? null,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
      },
    });
    return this.toEntity(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async updateProfile(
    id: string,
    data: Partial<{
      fullName: string;
      city: string;
      district: string;
      avatarUrl: string;
      whatsappPhone: string;
      phone: string;
    }>,
  ): Promise<UserEntity> {
    const user = await this.prisma.user.update({ where: { id }, data });
    return this.toEntity(user);
  }

  async exists(email: string, phone: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { OR: [{ email }, { phone }] },
    });
    return count > 0;
  }

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  async findActiveRefreshToken(tokenHash: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  }

  async markRefreshTokenUsed(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({ data });
  }

  async findActivePasswordResetToken(tokenHash: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null> {
    return this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async findMany(params: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    page: number;
    limit: number;
  }): Promise<{ items: UserEntity[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map((user) => this.toEntity(user)), total };
  }

  async updateStatus(userId: string, status: UserStatus): Promise<UserEntity> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status } });
    return this.toEntity(user);
  }

  async findIdentity(provider: string, providerId: string): Promise<UserIdentityRecord | null> {
    return this.prisma.userIdentity.findUnique({
      where: { provider_providerId: { provider, providerId } },
      select: { id: true, userId: true, provider: true, providerId: true, email: true },
    });
  }

  async createIdentity(data: {
    userId: string;
    provider: string;
    providerId: string;
    email?: string;
  }): Promise<UserIdentityRecord> {
    return this.prisma.userIdentity.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerId: data.providerId,
        email: data.email ?? null,
      },
      select: { id: true, userId: true, provider: true, providerId: true, email: true },
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async createEmailVerificationCode(data: {
    userId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.emailVerificationCode.create({ data });
  }

  async findLatestActiveEmailVerificationCode(userId: string): Promise<{
    id: string;
    codeHash: string;
    attempts: number;
    expiresAt: Date;
    usedAt: Date | null;
  } | null> {
    return this.prisma.emailVerificationCode.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true, attempts: true, expiresAt: true, usedAt: true },
    });
  }

  async incrementEmailVerificationAttempts(id: string): Promise<void> {
    await this.prisma.emailVerificationCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async markEmailVerificationCodeUsed(id: string): Promise<void> {
    await this.prisma.emailVerificationCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateActiveEmailVerificationCodes(userId: string): Promise<void> {
    // "Invalidate" by marking used rather than deleting — keeps a full audit trail of every code
    // ever issued, same principle as revoking (not deleting) refresh tokens above.
    await this.prisma.emailVerificationCode.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  private toEntity(prismaUser: PrismaUser): UserEntity {
    return new UserEntity({
      id: prismaUser.id,
      email: prismaUser.email,
      phone: prismaUser.phone,
      passwordHash: prismaUser.passwordHash,
      fullName: prismaUser.fullName,
      role: prismaUser.role as UserRole,
      status: prismaUser.status as UserStatus,
      avatarUrl: prismaUser.avatarUrl ?? null,
      city: prismaUser.city ?? null,
      district: prismaUser.district ?? null,
      whatsappPhone: prismaUser.whatsappPhone ?? null,
      emailVerifiedAt: prismaUser.emailVerifiedAt ?? null,
      phoneVerifiedAt: prismaUser.phoneVerifiedAt ?? null,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLoginAt: prismaUser.lastLoginAt ?? null,
    });
  }
}
