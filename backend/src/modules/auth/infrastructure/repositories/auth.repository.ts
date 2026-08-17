import { Injectable } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
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
    passwordHash: string;
    fullName: string;
    role: string;
    city?: string;
    district?: string;
  }): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: data.role as UserRole,
        status: UserStatus.ACTIVE,
        city: data.city ?? null,
        district: data.district ?? null,
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
      emailVerifiedAt: prismaUser.emailVerifiedAt ?? null,
      phoneVerifiedAt: prismaUser.phoneVerifiedAt ?? null,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLoginAt: prismaUser.lastLoginAt ?? null,
    });
  }
}
