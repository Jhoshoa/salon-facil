import { UserEntity, UserRole, UserStatus } from '../entities/user.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface IAuthRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  create(data: {
    email: string;
    phone: string;
    passwordHash: string;
    fullName: string;
    role: string;
    city?: string;
    district?: string;
  }): Promise<UserEntity>;
  updateLastLogin(id: string): Promise<void>;
  updateProfile(
    id: string,
    data: Partial<{
      fullName: string;
      city: string;
      district: string;
      avatarUrl: string;
      whatsappPhone: string;
      facebookUrl: string;
      instagramUrl: string;
      tiktokUrl: string;
    }>,
  ): Promise<UserEntity>;
  exists(email: string, phone: string): Promise<boolean>;
  createRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findActiveRefreshToken(tokenHash: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null>;
  markRefreshTokenUsed(id: string): Promise<void>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllRefreshTokens(userId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findActivePasswordResetToken(tokenHash: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  findMany(params: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    page: number;
    limit: number;
  }): Promise<{ items: UserEntity[]; total: number }>;
  updateStatus(userId: string, status: UserStatus): Promise<UserEntity>;
}
