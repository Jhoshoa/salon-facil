import { Injectable } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class RegisterUseCase {
  constructor(private readonly authService: AuthService) {}

  async execute(dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }
}
