export class UserEntity {
  id!: string;
  email!: string;
  phone!: string;
  /** Null for accounts created via an OAuth identity (Google, etc.) — they have no password of
   * their own. Password-based login must reject these before ever calling bcrypt.compare. */
  passwordHash!: string | null;
  fullName!: string;
  role!: UserRole;
  status!: UserStatus;
  avatarUrl: string | null = null;
  city: string | null = null;
  district: string | null = null;
  whatsappPhone: string | null = null;
  emailVerifiedAt: Date | null = null;
  phoneVerifiedAt: Date | null = null;
  createdAt!: Date;
  updatedAt!: Date;
  lastLoginAt: Date | null = null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  /** Gates trust/money actions (sending a booking request, publishing a venue) — deliberately
   * email-only, not phone: phone verification isn't implemented (WhatsApp/SMS has a per-message
   * cost that wasn't worth it for this), so requiring it here would make this permanently false.
   * See docs/auth-improvement/oauth-redirects-verification.md §4. */
  isVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  canCreateVenue(): boolean {
    return this.role === UserRole.OWNER || this.role === UserRole.ADMIN;
  }

  canAccessAdminPanel(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /** False for accounts that only ever signed in via an OAuth identity (Google, etc.) — they
   * never set a password, so login-by-password must be rejected before comparing anything. */
  hasPassword(): boolean {
    return this.passwordHash !== null;
  }
}

export enum UserRole {
  CLIENT = 'CLIENT',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}
