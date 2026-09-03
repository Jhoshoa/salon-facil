import { BookingEntity, BookingStatus, SelectedExtra } from '../entities/booking.entity';
import { CalendarBlockEntity } from '../entities/calendar-block.entity';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export type ReminderField = 'reminder7SentAt' | 'reminder3SentAt' | 'reminder1SentAt';

/** One occupied day within a venue's calendar, sourced from BookingDate. */
export interface OccupiedDateEntry {
  bookingId: string;
  date: Date;
  status: BookingStatus;
  eventType: string;
}

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
  ): Promise<OccupiedDateEntry[]>;
  /** Date-only (YYYY-MM-DD) strings, for dates within the range that already have an active booking. */
  findBookedDatesInRange(venueId: string, startDate: Date, endDate: Date): Promise<string[]>;
  findByVenueAndStatus(venueId: string, status: BookingStatus): Promise<BookingEntity[]>;
  create(data: CreateBookingData): Promise<BookingEntity>;
  updateStatus(id: string, status: BookingStatus): Promise<BookingEntity>;
  markDepositPaid(id: string): Promise<BookingEntity>;
  hasConflict(venueId: string, eventDate: Date, excludeBookingId?: string): Promise<boolean>;
  /** Frees every day held by this booking (used on cancel/reject). */
  deleteBookingDatesByBookingId(bookingId: string): Promise<void>;

  // Calendar Blocks
  createCalendarBlock(data: CreateCalendarBlockData): Promise<CalendarBlockEntity>;
  getCalendarBlocks(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarBlockEntity[]>;
  findCalendarBlockById(id: string): Promise<CalendarBlockEntity | null>;
  deleteCalendarBlock(id: string): Promise<void>;
  isDateBlocked(venueId: string, date: Date): Promise<boolean>;

  // Counts
  countByVenueAndStatus(venueId: string, status: BookingStatus): Promise<number>;
  /** Pending bookings across every venue owned by `ownerId`. */
  countPendingByOwner(ownerId: string): Promise<number>;
  /** Pending bookings platform-wide (ADMIN queue). */
  countAllPending(): Promise<number>;
  incrementVenueBookingCount(venueId: string): Promise<void>;

  // Reminders
  /** Confirmed bookings (APPROVED/DEPOSIT_PAID/FULLY_PAID) whose event lands on `eventDate`
   * and haven't had this particular reminder tier sent yet. */
  findBookingsDueForReminder(
    eventDate: Date,
    reminderField: ReminderField,
  ): Promise<BookingEntity[]>;
  markReminderSent(id: string, reminderField: ReminderField): Promise<void>;
}

export interface CreateBookingData {
  venueId: string;
  clientId: string;
  eventType: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  guestCount: number;
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  specialRequests?: string;
  selectedExtras?: SelectedExtra[];
  /** One entry per day in [startDate, endDate], used to create the BookingDate rows. */
  dailyBreakdown: { date: Date; appliedPrice: number; startTime: string; endTime: string }[];
}

export interface CreateCalendarBlockData {
  venueId: string;
  date: Date;
  reason?: string;
  isRecurring?: boolean;
  recurringRule?: Record<string, unknown>;
}
