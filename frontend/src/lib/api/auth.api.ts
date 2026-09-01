import { apiRequest } from './client';
import type {
  PublicAuthResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '@/types/api';

export const login = async (payload: LoginPayload): Promise<PublicAuthResponse> => {
  return apiRequest<PublicAuthResponse>('/auth/login', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const register = async (payload: RegisterPayload): Promise<PublicAuthResponse> => {
  return apiRequest<PublicAuthResponse>('/auth/register', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// No refreshToken param — the backend reads it from the httpOnly cookie itself. `allDevices`
// revokes every session for this user instead of just the one in this browser.
export const logout = async (allDevices?: boolean): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('/auth/logout', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ allDevices }),
  });
};

export const getMe = async (): Promise<AuthUser> => {
  return apiRequest<AuthUser>('/auth/me');
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<AuthUser> => {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const forgotPassword = async (payload: { email: string }): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const resetPassword = async (payload: {
  token: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
