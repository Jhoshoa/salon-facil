import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  service: 'salon-facil-api';
  version: string;
  database: {
    status: 'ok' | 'error';
    latency: string;
  };
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async health(): Promise<HealthResponse> {
    let databaseStatus: HealthResponse['database']['status'] = 'ok';
    let databaseLatency = 0;

    try {
      const startedAt = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      databaseLatency = Date.now() - startedAt;
    } catch {
      databaseStatus = 'error';
    }

    return {
      status: databaseStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'salon-facil-api',
      version: '0.1.0',
      database: {
        status: databaseStatus,
        latency: `${databaseLatency}ms`,
      },
    };
  }
}
