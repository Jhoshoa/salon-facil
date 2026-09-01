import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/interface/auth.module';
import { VenueModule } from './modules/venue/interface/venue.module';
import { BookingModule } from './modules/booking/interface/booking.module';
import { PaymentModule } from './modules/payment/interface/payment.module';
import { ReviewModule } from './modules/review/interface/review.module';
import { NotificationModule } from './modules/notification/interface/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { OwnershipGuard } from './shared/guards/ownership.guard';
import { RolesGuard } from './shared/guards/roles.guard';
import { ForbiddenLoggingFilter } from './shared/filters/forbidden-logging.filter';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
        // e2e tests hammer /auth/register and /auth/login far faster than any real client
        // would (many fixtures per spec file, all from the same local IP) — without this
        // they'd all share one throttle bucket and start failing with 429s partway through
        // a run, unrelated to whatever the test is actually checking.
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // BullMQ Workers use blocking Redis commands, which require this disabled on the
        // connection (otherwise ioredis's default retry behavior breaks them).
        connection: new Redis(configService.get<string>('REDIS_URL')!, {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    PrismaModule,
    AuthModule,
    VenueModule,
    BookingModule,
    PaymentModule,
    ReviewModule,
    NotificationModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ThrottlerModule.forRoot() above only registers the storage/config — without this guard
    // wired up as APP_GUARD, no request in the app was actually rate-limited (confirmed during
    // a pre-launch security audit). Runs first so throttled requests short-circuit before
    // spending effort on JWT verification.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OwnershipGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ForbiddenLoggingFilter,
    },
  ],
})
export class AppModule {}
