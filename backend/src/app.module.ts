import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
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
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { OwnershipGuard } from './shared/guards/ownership.guard';
import { RolesGuard } from './shared/guards/roles.guard';
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
      },
    ]),
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
  ],
})
export class AppModule {}
