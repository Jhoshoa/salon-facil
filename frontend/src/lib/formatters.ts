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

export const formatDateInput = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

export const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};
