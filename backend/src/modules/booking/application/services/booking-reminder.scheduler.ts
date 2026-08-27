import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingService } from './booking.service';

@Injectable()
export class BookingReminderScheduler {
  private readonly logger = new Logger(BookingReminderScheduler.name);

  constructor(private readonly bookingService: BookingService) {}

  // Runs once a day (server-local time — fine for this single-region deployment) and sends
  // the 7/3/1-day-before reminders for any confirmed booking that hasn't gotten its tier yet.
  @Cron('0 9 * * *')
  async handleDailyReminders(): Promise<void> {
    const sentCount = await this.bookingService.sendDueReminders();
    if (sentCount > 0) {
      this.logger.log(`Sent ${sentCount} booking reminder notification(s)`);
    }
  }
}
