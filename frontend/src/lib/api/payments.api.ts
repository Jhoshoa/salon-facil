import { apiRequest, buildQueryString } from './client';
import type {
  CreatePaymentPayload,
  OwnerEarnings,
  PaginatedResponse,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '@/types/api';

export const createPayment = async (
  bookingId: string,
  payload: CreatePaymentPayload,
): Promise<Payment> => {
  return apiRequest<Payment>(`/payments/bookings/${bookingId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const uploadPaymentProof = async (paymentId: string, file: File): Promise<Payment> => {
  const formData = new FormData();
  formData.set('file', file);

  return apiRequest<Payment>(`/payments/${paymentId}/proof`, {
    method: 'POST',
    body: formData,
  });
};

export const getBookingPayments = async (bookingId: string): Promise<Payment[]> => {
  return apiRequest<Payment[]>(`/payments/booking/${bookingId}`);
};

export const getPendingOwnerPayments = async (): Promise<Payment[]> => {
  return apiRequest<Payment[]>('/payments/owner/pending');
};

export const confirmPayment = async (paymentId: string, notes?: string): Promise<Payment> => {
  return apiRequest<Payment>(`/payments/${paymentId}/confirm`, {
    method: 'PUT',
    body: JSON.stringify({ notes }),
  });
};

export const rejectPayment = async (paymentId: string, reason: string): Promise<Payment> => {
  return apiRequest<Payment>(`/payments/${paymentId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });
};

export const refundPayment = async (paymentId: string, reason: string): Promise<Payment> => {
  return apiRequest<Payment>(`/payments/${paymentId}/refund`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });
};

// ========== ADMIN ==========

export interface AdminPaymentsParams {
  search?: string;
  status?: PaymentStatus;
  venueId?: string;
  page?: number;
  limit?: number;
}

export const getAdminPayments = async (
  params: AdminPaymentsParams = {},
): Promise<PaginatedResponse<Payment>> => {
  return apiRequest<PaginatedResponse<Payment>>(`/admin/payments${buildQueryString(params)}`);
};

export const getOwnerEarnings = async (months = 6, venueId?: string): Promise<OwnerEarnings> => {
  const search = new URLSearchParams({ months: String(months) });
  if (venueId) search.set('venueId', venueId);
  return apiRequest<OwnerEarnings>(`/payments/owner/earnings?${search.toString()}`);
};

export interface OwnerCompletedPaymentsFilter {
  venueId?: string;
  method?: PaymentMethod;
  /** 'YYYY-MM' -- wins over `monthsBack` when both are set. */
  month?: string;
  monthsBack?: number;
}

export const getOwnerCompletedPayments = async (
  filters: OwnerCompletedPaymentsFilter,
): Promise<Payment[]> => {
  const search = new URLSearchParams();
  if (filters.venueId) search.set('venueId', filters.venueId);
  if (filters.method) search.set('method', filters.method);
  if (filters.month) search.set('month', filters.month);
  if (filters.monthsBack) search.set('monthsBack', String(filters.monthsBack));
  return apiRequest<Payment[]>(`/payments/owner/earnings/payments?${search.toString()}`);
};
