import { UserEntity, UserRole, UserStatus } from '../entities/user.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface UserIdentityRecord {
  id: string;
  userId: string;
  provider: string;
  providerId: string;
  email: string | null;
}

export interface IAuthRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  create(data: {
    email: string;
    phone: string;
    /** Omit entirely for OAuth-created accounts — they have no password of their own. */
    passwordHash?: string;
    fullName: string;
    role: string;
    city?: string;
    district?: string;
    /** Set for OAuth accounts whose provider already proved the address (e.g. Google) — skips
     * the code-verification step for them. Omit for password-based registration. */
    emailVerifiedAt?: Date;
    /** Defaults to ACTIVE (every existing caller relies on this). Admin-created placeholder
     * owner accounts (see owner-invite flow) pass PENDING_VERIFICATION explicitly so the account
     * can't log in — and has no password to log in with anyway — until the owner claims it. */
    status?: UserStatus;
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
      phone: string;
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
  /** Marks every still-active (unused, unexpired) token for this user as used, without
   * requiring their actual value -- called right before issuing a fresh one, so a user who
   * requests "forgot password" more than once never has two valid reset links outstanding at
   * the same time. */
  invalidateActivePasswordResetTokens(userId: string): Promise<void>;
  findMany(params: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    page: number;
    limit: number;
  }): Promise<{ items: UserEntity[]; total: number }>;
  updateStatus(userId: string, status: UserStatus): Promise<UserEntity>;
  updateRole(userId: string, role: UserRole): Promise<UserEntity>;
  countByRole(filters: { search?: string; status?: UserStatus }): Promise<Record<UserRole, number>>;
  countByStatus(filters: { search?: string; role?: UserRole }): Promise<Record<UserStatus, number>>;

  // --- OAuth identities (Google today, extensible to other providers) ---
  findIdentity(provider: string, providerId: string): Promise<UserIdentityRecord | null>;
  createIdentity(data: {
    userId: string;
    provider: string;
    providerId: string;
    email?: string;
  }): Promise<UserIdentityRecord>;
  markEmailVerified(userId: string): Promise<void>;

  // --- Email verification codes ---
  createEmailVerificationCode(data: {
    userId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findLatestActiveEmailVerificationCode(userId: string): Promise<{
    id: string;
    codeHash: string;
    attempts: number;
    expiresAt: Date;
    usedAt: Date | null;
  } | null>;
  incrementEmailVerificationAttempts(id: string): Promise<void>;
  markEmailVerificationCodeUsed(id: string): Promise<void>;
  invalidateActiveEmailVerificationCodes(userId: string): Promise<void>;
  /** Counts every code issued for this user since `since`, active or not — codes are never
   * deleted (see invalidateActiveEmailVerificationCodes), so this doubles as a resend-attempt
   * counter regardless of whether earlier codes were used, expired, or superseded. */
  countEmailVerificationCodesSince(userId: string, since: Date): Promise<number>;

  // --- Owner invite tokens (admin phone-onboarding claim flow) ---
  createOwnerInviteToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  /** Looked up by both validate (view, doesn't consume) and claim (activate, consumes) —
   * `usedAt` is checked by the caller, not filtered out here, since a used token must still be
   * distinguishable from a never-existed one for the right error message. */
  findOwnerInviteToken(tokenHash: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null>;
  markOwnerInviteTokenUsed(id: string): Promise<void>;
  /** Same idea as invalidateActivePasswordResetTokens — called right before issuing a fresh
   * token so a resent invite immediately supersedes any earlier one. */
  invalidateActiveOwnerInviteTokens(userId: string): Promise<void>;
}
