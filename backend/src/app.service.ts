import { Injectable } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  service: 'salon-facil-api';
  version: string;
}

@Injectable()
export class AppService {
  health(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'salon-facil-api',
      version: '0.1.0',
    };
  }
}
