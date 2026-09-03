import { apiRequest } from './client';
import type { Notification } from '@/types/api';

export const getMyNotifications = async (): Promise<Notification[]> => {
  return apiRequest<Notification[]>('/notifications');
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const result = await apiRequest<{ count: number }>('/notifications/unread-count');
  return result.count;
};

export const markNotificationAsRead = async (id: string): Promise<Notification> => {
  return apiRequest<Notification>(`/notifications/${id}/read`, { method: 'PUT' });
};
