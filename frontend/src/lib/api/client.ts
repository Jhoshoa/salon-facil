'use client';

import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types/api';

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

export const toApiError = async (response: Response): Promise<ApiError> => {
  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const message =
    typeof body === 'object' && body !== null && 'message' in body
      ? Array.isArray(body.message)
        ? body.message.join(', ')
        : String(body.message)
      : 'No se pudo completar la solicitud';

  return {
    statusCode: response.status,
    message,
  };
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { auth = true, headers, body, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const requestHeaders = new Headers(headers);

  if (!(body instanceof FormData) && body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1${path}`, {
    ...rest,
    body,
    headers: requestHeaders,
  });

  if (!response.ok) {
    const error = await toApiError(response);
    if (error.statusCode === 401) {
      useAuthStore.getState().logout();
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

type QueryParams = object;

export const buildQueryString = <TParams extends QueryParams>(params: TParams) => {
  const searchParams = new URLSearchParams();

  Object.entries(params as Record<string, string | number | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};
