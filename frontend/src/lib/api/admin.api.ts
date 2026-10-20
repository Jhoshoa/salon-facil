import { apiRequest, buildQueryString } from './client';
import type {
  AdminAnalyticsDashboard,
  AdminUser,
  AdminUserCounts,
  AdminUserDetail,
  AuditLogEntry,
  PaginatedResponse,
} from '@/types/api';

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

export const updateAdminUserStatus = async (userId: string, status: string): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const updateAdminUserRole = async (
  userId: string,
  role: 'CLIENT' | 'OWNER',
): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
};

export const getAdminUserDetail = async (userId: string): Promise<AdminUserDetail> => {
  return apiRequest<AdminUserDetail>(`/admin/users/${userId}`);
};

export const getAdminUserCounts = async (
  params: { search?: string; role?: string; status?: string } = {},
): Promise<AdminUserCounts> => {
  return apiRequest<AdminUserCounts>(`/admin/users/counts${buildQueryString(params)}`);
};

export interface AuditLogParams {
  adminId?: string;
  targetType?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export const getAuditLog = async (
  params: AuditLogParams = {},
): Promise<PaginatedResponse<AuditLogEntry>> => {
  return apiRequest<PaginatedResponse<AuditLogEntry>>(
    `/admin/audit-log${buildQueryString(params)}`,
  );
};
