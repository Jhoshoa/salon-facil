import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/interface/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AdminAnalyticsService } from './application/services/admin-analytics.service';
import { AdminUserService } from './application/services/admin-user.service';
import { AdminAnalyticsController } from './interface/admin-analytics.controller';
import { AdminUserController } from './interface/admin-user.controller';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [AdminAnalyticsController, AdminUserController],
  providers: [AdminAnalyticsService, AdminUserService],
})
export class AdminModule {}
