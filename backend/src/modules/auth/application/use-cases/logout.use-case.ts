import { Injectable } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly authService: AuthService) {}

  async execute(userId: string, refreshToken?: string): Promise<{ message: string }> {
    return this.authService.logout(userId, refreshToken);
  }
}
