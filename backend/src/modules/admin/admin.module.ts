import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/interface/auth.module';
import { AdminAnalyticsService } from './application/services/admin-analytics.service';
import { AdminUserService } from './application/services/admin-user.service';
import { AdminAnalyticsController } from './interface/admin-analytics.controller';
import { AdminUserController } from './interface/admin-user.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminAnalyticsController, AdminUserController],
  providers: [AdminAnalyticsService, AdminUserService],
})
export class AdminModule {}
