import { apiRequest } from './client';
import type { CreatePaymentPayload, Payment } from '@/types/api';

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
