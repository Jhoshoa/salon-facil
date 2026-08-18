import { BookingEntity, BookingStatus } from '../entities/booking.entity';
import { CalendarBlockEntity } from '../entities/calendar-block.entity';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface IBookingRepository {
  // Booking CRUD
  findById(id: string): Promise<BookingEntity | null>;
  findByVenueAndDate(venueId: string, eventDate: Date): Promise<BookingEntity | null>;
  findByClient(clientId: string): Promise<BookingEntity[]>;
  findByVenue(venueId: string): Promise<BookingEntity[]>;
  findActiveByVenueInRange(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BookingEntity[]>;
  findByVenueAndStatus(venueId: string, status: BookingStatus): Promise<BookingEntity[]>;
  create(data: CreateBookingData): Promise<BookingEntity>;
  updateStatus(id: string, status: BookingStatus): Promise<BookingEntity>;
  markDepositPaid(id: string): Promise<BookingEntity>;
  hasConflict(venueId: string, eventDate: Date, excludeBookingId?: string): Promise<boolean>;

  // Calendar Blocks
  createCalendarBlock(data: CreateCalendarBlockData): Promise<CalendarBlockEntity>;
  getCalendarBlocks(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarBlockEntity[]>;
  findCalendarBlockById(id: string): Promise<CalendarBlockEntity | null>;
  deleteCalendarBlock(id: string): Promise<void>;
  deleteCalendarBlockByVenueAndDate(venueId: string, date: Date): Promise<void>;
  isDateBlocked(venueId: string, date: Date): Promise<boolean>;

  // Counts
  countByVenueAndStatus(venueId: string, status: BookingStatus): Promise<number>;
  incrementVenueBookingCount(venueId: string): Promise<void>;
}

export interface CreateBookingData {
  venueId: string;
  clientId: string;
  eventType: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  guestCount: number;
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  specialRequests?: string;
}

export interface CreateCalendarBlockData {
  venueId: string;
  date: Date;
  reason?: string;
  isRecurring?: boolean;
  recurringRule?: Record<string, unknown>;
}
