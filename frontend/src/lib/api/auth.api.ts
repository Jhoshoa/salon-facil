import { apiRequest } from './client';
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload, UpdateProfilePayload } from '@/types/api';

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>('/auth/login', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>('/auth/register', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const logout = async (refreshToken?: string): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
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
