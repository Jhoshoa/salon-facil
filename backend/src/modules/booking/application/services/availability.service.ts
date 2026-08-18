import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../../domain/repositories/booking.repository.interface';
import { BookingStatus } from '../../domain/entities/booking.entity';

@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async checkAvailability(
    venueId: string,
    eventDate: Date,
  ): Promise<{
    available: boolean;
    reason: string | null;
    conflicts: string[];
  }> {
    const conflicts: string[] = [];

    const hasConflict = await this.bookingRepository.hasConflict(venueId, eventDate);
    if (hasConflict) {
      conflicts.push('Fecha ya reservada');
    }

    const isBlocked = await this.bookingRepository.isDateBlocked(venueId, eventDate);
    if (isBlocked) {
      conflicts.push('Fecha bloqueada por el propietario');
    }

    return {
      available: conflicts.length === 0,
      reason: conflicts.length > 0 ? conflicts[0] : null,
      conflicts,
    };
  }

  async checkAvailabilityRange(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: string; available: boolean }[]> {
    const results: { date: string; available: boolean }[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const checkDate = new Date(current);
      const availability = await this.checkAvailability(venueId, checkDate);
      results.push({
        date: checkDate.toISOString().split('T')[0],
        available: availability.available,
      });
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  async getVenueBookings(venueId: string): Promise<{
    pending: number;
    confirmed: number;
    completed: number;
  }> {
    const [pending, confirmed, completed] = await Promise.all([
      this.bookingRepository.countByVenueAndStatus(venueId, BookingStatus.PENDING),
      this.bookingRepository.countByVenueAndStatus(venueId, BookingStatus.APPROVED),
      this.bookingRepository.countByVenueAndStatus(venueId, BookingStatus.COMPLETED),
    ]);

    return { pending, confirmed, completed };
  }
}
