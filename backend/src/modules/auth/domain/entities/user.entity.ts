export class UserEntity {
  id!: string;
  email!: string;
  phone!: string;
  passwordHash!: string;
  fullName!: string;
  role!: UserRole;
  status!: UserStatus;
  avatarUrl: string | null = null;
  city: string | null = null;
  district: string | null = null;
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

  isVerified(): boolean {
    return this.emailVerifiedAt !== null && this.phoneVerifiedAt !== null;
  }

  canCreateVenue(): boolean {
    return this.role === UserRole.OWNER || this.role === UserRole.ADMIN;
  }

  canAccessAdminPanel(): boolean {
    return this.role === UserRole.ADMIN;
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
