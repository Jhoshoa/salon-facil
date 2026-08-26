import { Module } from '@nestjs/common';
import { AdminAnalyticsService } from './application/services/admin-analytics.service';
import { AdminAnalyticsController } from './interface/admin-analytics.controller';

@Module({
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
})
export class AdminModule {}
