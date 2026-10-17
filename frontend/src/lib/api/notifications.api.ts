import { apiRequest } from './client';
import type {
  Notification,
  NotificationChannel,
  NotificationPreference,
  NotificationType,
} from '@/types/api';

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

export const getNotificationPreferences = async (): Promise<NotificationPreference[]> => {
  return apiRequest<NotificationPreference[]>('/notifications/preferences');
};

export const setNotificationPreference = async (payload: {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}): Promise<NotificationPreference> => {
  return apiRequest<NotificationPreference>('/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};
