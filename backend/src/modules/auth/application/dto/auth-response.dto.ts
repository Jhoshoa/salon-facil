export class AuthResponseDto {
  user!: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    role: string;
    status: string;
    avatarUrl: string | null;
    city: string | null;
    district: string | null;
    whatsappPhone: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
  };
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}
