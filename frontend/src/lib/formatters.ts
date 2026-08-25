export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    maximumFractionDigits: 0,
  }).format(value);
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date-only strings ("2026-08-28") are parsed by `new Date()` as UTC midnight; formatting
 * them in a timezone behind UTC shifts the displayed day back by one. Build them from local
 * year/month/day instead so the calendar day never moves.
 *
 * The same trap applies to `@db.Date` columns (eventDate, endDate, ...): the API serializes
 * them as a full ISO instant at exact UTC midnight ("2026-10-12T00:00:00.000Z"), not a plain
 * date-only string, but they still represent a calendar day, not a moment in time. A genuine
 * timestamp landing on exact midnight UTC is effectively never going to happen, so detecting
 * that suffix is a safe way to tell the two apart and apply the same local-date construction.
 */
const UTC_MIDNIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/;

const parseDateValue = (value: string | Date): Date => {
  const isDateOnly =
    typeof value === 'string' && (DATE_ONLY_PATTERN.test(value) || UTC_MIDNIGHT_PATTERN.test(value));

  if (isDateOnly) {
    const [year, month, day] = (value as string).split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

export const formatDate = (value: string | Date) => {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parseDateValue(value));
};

/**
 * Booking.startTime/endTime are `@db.Time` columns; the API serializes them as full ISO
 * instants on the 1970-01-01 epoch ("1970-01-01T18:00:00.000Z"), not plain "HH:MM" — only the
 * time-of-day part is meaningful. Extract it before formatting so both shapes work.
 */
export const formatTime12h = (value: string) => {
  const timePart = value.includes('T') ? (value.split('T')[1]?.slice(0, 5) ?? value) : value;
  const [hoursStr, minutesStr = '00'] = timePart.split(':');
  const hours = Number(hoursStr);
  if (Number.isNaN(hours)) return value;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${minutesStr.padStart(2, '0')} ${period}`;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

/**
 * `toISOString()` converts to UTC first, which can silently roll the date forward or back
 * a day near midnight in timezones offset from UTC (e.g. Bolivia, UTC-4). Building the string
 * from local getFullYear/getMonth/getDate keeps it matching the user's actual calendar day.
 */
export const formatDateInput = (date = new Date()) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const getCurrentMonth = (date = new Date()) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
};
