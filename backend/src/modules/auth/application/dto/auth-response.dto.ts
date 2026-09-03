interface AuthUserDto {
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
}

// Internal shape used between AuthService and the controller — includes the raw tokens so the
// controller can set them as httpOnly cookies. Never serialize this directly as an HTTP
// response body; use PublicAuthResponseDto for that (see auth.controller.ts).
export class AuthResponseDto {
  user!: AuthUserDto;
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}

// What actually goes over the wire as JSON. Tokens travel only via Set-Cookie (httpOnly), never
// in a response body a script could read — see the JWT-in-httpOnly-cookie migration.
export class PublicAuthResponseDto {
  user!: AuthUserDto;
  expiresIn!: number;
}
