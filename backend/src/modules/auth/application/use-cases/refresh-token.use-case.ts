import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly authService: AuthService) {}

  async execute(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }
    return this.authService.refreshTokens(refreshToken);
  }
}
