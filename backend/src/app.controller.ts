import { Controller, Get } from '@nestjs/common';
import { Public } from './shared/decorators/public.decorator';
import { AppService, HealthResponse } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  health(): Promise<HealthResponse> {
    return this.appService.health();
  }
}
