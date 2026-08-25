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
 * year/month/day instead so the calendar day never moves. Full timestamps keep default parsing.
 */
const parseDateValue = (value: string | Date): Date => {
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
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

export const formatTime12h = (value: string) => {
  const [hoursStr, minutesStr = '00'] = value.split(':');
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
