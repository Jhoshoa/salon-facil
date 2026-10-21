import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/interface/auth.module';
import { VenueModule } from '../venue/interface/venue.module';
import { BookingModule } from '../booking/interface/booking.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationModule } from '../notification/interface/notification.module';
import { AdminAnalyticsService } from './application/services/admin-analytics.service';
import { AdminUserService } from './application/services/admin-user.service';
import { AdminOwnerInviteService } from './application/services/admin-owner-invite.service';
import { AdminAnalyticsController } from './interface/admin-analytics.controller';
import { AdminUserController } from './interface/admin-user.controller';
import { AdminOwnerInviteController } from './interface/admin-owner-invite.controller';

@Module({
  imports: [AuthModule, VenueModule, BookingModule, AuditLogModule, NotificationModule],
  controllers: [AdminAnalyticsController, AdminUserController, AdminOwnerInviteController],
  providers: [AdminAnalyticsService, AdminUserService, AdminOwnerInviteService],
})
export class AdminModule {}
