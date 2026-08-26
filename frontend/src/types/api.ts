export interface ApiError {
  statusCode: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  venues?: T[];
  data?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  status: string;
  avatarUrl: string | null;
  city: string | null;
  district: string | null;
  whatsappPhone: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
}

export interface UpdateProfilePayload {
  fullName?: string;
  city?: string;
  district?: string;
  avatarUrl?: string;
  whatsappPhone?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
}

export type UserRole = 'CLIENT' | 'OWNER' | 'ADMIN';

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  phone: string;
  fullName: string;
  role: 'CLIENT' | 'OWNER';
  city?: string;
  district?: string;
}

export interface VenueService {
  id: string;
  venueId: string;
  name: string;
  icon: string | null;
  description: string | null;
  isIncluded: boolean;
  extraCost: number | null;
  sortOrder: number;
}

export interface VenuePrice {
  id: string;
  venueId: string;
  priceType: 'BASE' | 'WEEKEND' | 'HOLIDAY' | 'CUSTOM_DATE' | 'SEASON_HIGH' | 'EARLY_BIRD';
  dayOfWeek: number | null;
  specificDate: string | null;
  startDate: string | null;
  endDate: string | null;
  price: number;
  currency: string;
  /** null = hereda la unidad por defecto del local; con valor, fuerza esa unidad para los dias que cubre. */
  unit: PriceUnit | null;
  discountPercent: number | null;
  discountLabel: string | null;
  isActive: boolean;
}

export interface CatalogItem {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CatalogItemInput {
  key: string;
  name: string;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateCatalogItemPayload {
  name?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type AmenityCategory =
  | 'FACILITY'
  | 'COMFORT'
  | 'AUDIO_VISUAL'
  | 'CATERING_DRINKS'
  | 'PARKING'
  | 'ACCESSIBILITY'
  | 'SAFETY'
  | 'SERVICES';

export type VenueMediaType = 'IMAGE' | 'VIDEO' | 'VIRTUAL_TOUR';
export type PriceUnit = 'EVENT' | 'HOUR' | 'DAY';

export interface Amenity {
  id: string;
  key: string;
  name: string;
  category: AmenityCategory;
  icon: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CatalogAmenityInput extends CatalogItemInput {
  category: AmenityCategory;
}

export interface UpdateCatalogAmenityPayload extends UpdateCatalogItemPayload {
  category?: AmenityCategory;
}

export type AmenityCatalog = Partial<Record<AmenityCategory, Amenity[]>>;

export interface VenueAmenity {
  id: string;
  amenity: Amenity;
  isIncluded: boolean;
  extraCost: number | null;
  notes: string | null;
}

export interface VenueUse {
  id: string;
  useTypeId: string;
  useType: CatalogItem;
  isPrimary: boolean;
}

export interface VenueOpeningHour {
  id: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface VenueMedia {
  id: string;
  type: VenueMediaType;
  url: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface Venue {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  address: string;
  district: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacityMin: number;
  capacityMax: number;
  squareMeters: number | null;
  spaceTypeId: string | null;
  spaceType: CatalogItem | null;
  minimumHours: number;
  priceUnit: PriceUnit;
  instantBooking: boolean;
  allowsMultipleDays: boolean;
  photos: string[];
  media?: VenueMedia[];
  rules: string | null;
  cancellationPolicy: string | null;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
  isVerified: boolean;
  viewCount: number;
  bookingCount: number;
  services?: VenueService[];
  prices?: VenuePrice[];
  amenities?: VenueAmenity[];
  uses?: VenueUse[];
  openingHours?: VenueOpeningHour[];
  owner?: { id: string; fullName: string; phone?: string; avatarUrl: string | null };
  reviewCount?: number;
  averageRating?: number;
}

export interface VenuePriceInput {
  priceType: VenuePrice['priceType'];
  dayOfWeek?: number;
  specificDate?: string;
  startDate?: string;
  endDate?: string;
  price: number;
  unit?: PriceUnit;
  discountPercent?: number;
  discountLabel?: string;
}

export interface SeasonalEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  note: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SeasonalEventInput {
  name: string;
  startDate: string;
  endDate: string;
  note?: string;
  sortOrder?: number;
}

export interface UpdateSeasonalEventPayload {
  name?: string;
  startDate?: string;
  endDate?: string;
  note?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface VenueAmenityInput {
  amenityId: string;
  isIncluded?: boolean;
  extraCost?: number;
  notes?: string;
}

export interface VenueUseInput {
  useTypeId: string;
  isPrimary?: boolean;
}

export interface VenueOpeningHourInput {
  dayOfWeek: number;
  opensAt?: string;
  closesAt?: string;
  isClosed?: boolean;
}

export interface VenueFormPayload {
  name: string;
  description: string;
  shortDescription?: string;
  address: string;
  district: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  capacityMax: number;
  capacityMin?: number;
  squareMeters?: number;
  spaceTypeId?: string;
  priceUnit?: PriceUnit;
  minimumHours?: number;
  instantBooking?: boolean;
  allowsMultipleDays?: boolean;
  rules?: string;
  cancellationPolicy?: string;
  prices?: VenuePriceInput[];
  amenities?: VenueAmenityInput[];
  useTypes?: VenueUseInput[];
  openingHours?: VenueOpeningHourInput[];
}

export interface VenueCompletion {
  score: number;
  missing: string[];
  canPublish: boolean;
}

export interface VenueSearchParams {
  query?: string;
  city?: string;
  district?: string;
  guestCount?: number;
  minCapacity?: number;
  maxCapacity?: number;
  minPrice?: number;
  maxPrice?: number;
  priceUnit?: PriceUnit;
  services?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  amenities?: string[];
  spaceTypes?: string[];
  useTypes?: string[];
  hasParking?: boolean;
  parkingCapacity?: number;
  hasCatering?: boolean;
  allowsAlcohol?: boolean;
  allowsExternalCatering?: boolean;
  instantBooking?: boolean;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  sortBy?:
    | 'featured'
    | 'price'
    | 'priceAsc'
    | 'priceDesc'
    | 'capacity'
    | 'capacityDesc'
    | 'rating'
    | 'ratingDesc'
    | 'createdAt'
    | 'newest';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DEPOSIT_PAID'
  | 'FULLY_PAID'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_OWNER'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface Booking {
  id: string;
  venueId: string;
  clientId: string;
  eventType: string;
  eventDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: BookingStatus;
  specialRequests: string | null;
  venue?: Venue;
  client?: { id: string; fullName: string; email: string; phone: string | null };
}

export interface Review {
  id: string;
  venueId: string;
  clientId: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  createdAt: string;
  client?: { id: string; fullName: string };
}

export interface CreateReviewPayload {
  rating: number;
  comment?: string;
}

export interface DailyScheduleEntry {
  date: string;
  startTime: string;
  endTime: string;
}

export interface CreateBookingPayload {
  eventType: string;
  eventDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequests?: string;
  /** Horario por dia solo para los dias cuya unidad efectiva resulta HOUR. */
  dailySchedule?: DailyScheduleEntry[];
}

export interface DailyPriceBreakdown {
  date: string;
  matchedPriceType: string;
  unit: PriceUnit;
  appliedPrice: number;
}

export interface RangePriceCalculation {
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  days: DailyPriceBreakdown[];
}

export interface CreateBookingResponse {
  booking: Booking;
  priceCalculation: RangePriceCalculation;
}

export interface AvailabilityResult {
  available: boolean;
  reason: string | null;
  conflicts: string[];
}

export interface AvailabilityRangeEntry {
  date: string;
  available: boolean;
}

export interface CalendarDayBooking {
  id: string;
  date: string;
  type: 'booking';
  status: BookingStatus;
  eventType: string;
}

export interface CalendarDayBlock {
  id: string;
  date: string;
  type: 'block';
  reason: string | null;
}

export interface VenueCalendar {
  venueId: string;
  startDate: string;
  endDate: string;
  bookings: CalendarDayBooking[];
  blocks: CalendarDayBlock[];
}

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIAL';
export type PaymentType = 'DEPOSIT' | 'FULL' | 'REMAINING';
export type PaymentMethod = 'QR_BANK' | 'BANK_TRANSFER' | 'TIGO_MONEY' | 'CARD' | 'CASH';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  paymentType: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  comprobanteUrl: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  transactionReference: string | null;
  createdAt: string;
  booking?: Booking;
}

export interface EarningsBreakdownRow {
  venueId: string;
  venueName: string;
  month: string;
  total: number;
  count: number;
}

export interface OwnerEarnings {
  summary: { totalEarned: number; paymentCount: number };
  breakdown: EarningsBreakdownRow[];
}

export interface CreatePaymentPayload {
  paymentType: PaymentType;
  method: PaymentMethod;
  amount: number;
  transactionReference?: string;
  notes?: string;
}
