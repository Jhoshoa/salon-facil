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

// Used to recover session state after a flow that sets the httpOnly cookies without any
// client-side JS seeing a login response — see auth.store.ts's hydrateSession.
export const getCurrentUser = async (): Promise<AuthUser> => {
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

export const verifyEmail = async (code: string): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
};

export const resendVerificationCode = async (): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('/auth/resend-verification-code', {
    method: 'POST',
  });
};

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Not a fetch — this is a real cross-domain redirect to Google, so the caller navigates the
// browser to this URL directly (window.location.href / an <a href>) instead of calling it as
// an API function. `next`/`intent` become the signed OAuth `state` server-side (see
// docs/auth-improvement/oauth-redirects-verification.md §2).
export const getGoogleAuthUrl = (params: { next?: string; intent?: 'CLIENT' | 'OWNER' } = {}) => {
  const searchParams = new URLSearchParams();
  if (params.next) searchParams.set('next', params.next);
  if (params.intent) searchParams.set('intent', params.intent);
  const query = searchParams.toString();
  return `${getApiBaseUrl()}/api/v1/auth/google${query ? `?${query}` : ''}`;
};
