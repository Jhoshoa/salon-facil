import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : process.env.NODE_ENV === 'test'
            ? []
            : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const tableNames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const tables = tableNames
      .map(({ tablename }) => tablename)
      .filter((tableName) => tableName !== '_prisma_migrations')
      .map((tableName) => `"public"."${tableName}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }
}
