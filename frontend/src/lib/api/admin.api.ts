import { apiRequest, buildQueryString } from './client';
import type { AdminAnalyticsDashboard, AdminUser, PaginatedResponse } from '@/types/api';

export const getAdminAnalyticsDashboard = async (): Promise<AdminAnalyticsDashboard> => {
  return apiRequest<AdminAnalyticsDashboard>('/admin/analytics/dashboard');
};

export interface AdminUsersParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const getAdminUsers = async (
  params: AdminUsersParams = {},
): Promise<PaginatedResponse<AdminUser>> => {
  return apiRequest<PaginatedResponse<AdminUser>>(`/admin/users${buildQueryString(params)}`);
};

export const updateAdminUserStatus = async (
  userId: string,
  status: string,
): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};
