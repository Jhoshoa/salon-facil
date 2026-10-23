import { apiRequest, buildQueryString } from './client';
import type {
  AdminAnalyticsDashboard,
  AdminUser,
  AdminUserCounts,
  AdminUserDetail,
  AuditLogEntry,
  CreateOwnerInvitePayload,
  CreateOwnerInviteResult,
  OwnerInviteContact,
  PaginatedResponse,
  PendingOwnerInvite,
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

/** Registro de local por telefono -- crea (o reusa) la cuenta placeholder del dueno y el local
 * en DRAFT. No manda la invitacion todavia, eso es sendOwnerInvite aparte, para que el admin
 * pueda seguir completando el local (fotos, comodidades) antes de que el dueno lo vea. */
export const createOwnerInvite = async (
  payload: CreateOwnerInvitePayload,
): Promise<CreateOwnerInviteResult> => {
  return apiRequest<CreateOwnerInviteResult>('/admin/owner-invites', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const sendOwnerInvite = async (venueId: string): Promise<{ resent: boolean }> => {
  return apiRequest<{ resent: boolean }>(`/admin/owner-invites/${venueId}/send`, {
    method: 'POST',
  });
};

/** Attaches a real owner to a venue that already exists (created some other way, e.g. an admin
 * testing something directly) and sends the claim invite in one step. Only works while the
 * venue still belongs to an ADMIN account -- fails with a clear error otherwise. */
export const assignVenueOwner = async (
  venueId: string,
  owner: OwnerInviteContact,
): Promise<{ resent: boolean }> => {
  return apiRequest<{ resent: boolean }>(`/admin/owner-invites/${venueId}/assign-owner`, {
    method: 'POST',
    body: JSON.stringify(owner),
  });
};

export interface AdminOwnerInvitesParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const getAdminOwnerInvites = async (
  params: AdminOwnerInvitesParams = {},
): Promise<PaginatedResponse<PendingOwnerInvite>> => {
  return apiRequest<PaginatedResponse<PendingOwnerInvite>>(
    `/admin/owner-invites${buildQueryString(params)}`,
  );
};
