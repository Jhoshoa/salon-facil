export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDate = (value: string | Date) => {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export const formatTime12h = (value: string) => {
  const [hoursStr, minutesStr = '00'] = value.split(':');
  const hours = Number(hoursStr);
  if (Number.isNaN(hours)) return value;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${minutesStr.padStart(2, '0')} ${period}`;
};

export const formatDateInput = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

export const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};
