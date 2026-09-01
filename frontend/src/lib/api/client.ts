'use client';

import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types/api';

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  // Whether a 401 on this call should trigger the silent-refresh-then-retry flow (and, if that
  // fails too, a client-side logout). Set to false for calls where a 401 is an expected,
  // unremarkable outcome — login/register with wrong credentials, or the refresh call itself
  // (which would otherwise recurse into itself on failure).
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

// Access/refresh tokens live only in httpOnly cookies the browser attaches automatically
// (credentials: 'include' below) — no token is ever read from or written to JS-accessible
// storage here. A single in-flight refresh call is shared across any requests that hit a 401
// at the same time, so a burst of parallel queries doesn't fire /auth/refresh once per query.
let refreshPromise: Promise<boolean> | null = null;

const tryRefresh = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { auth = true, headers, body, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (!(body instanceof FormData) && body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const doFetch = () =>
    fetch(`${getApiBaseUrl()}/api/v1${path}`, {
      ...rest,
      body,
      headers: requestHeaders,
      credentials: 'include',
    });

  let response = await doFetch();

  if (response.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (error.statusCode === 401 && auth) {
      useAuthStore.getState().logout();
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

type QueryParamValue =
  string | number | boolean | Array<string | number | boolean> | undefined | null;
type QueryParams = object;

export const buildQueryString = <TParams extends QueryParams>(params: TParams) => {
  const searchParams = new URLSearchParams();

  Object.entries(params as Record<string, QueryParamValue>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      const normalizedValue = value.filter((item) => item !== '').join(',');
      if (normalizedValue) {
        searchParams.set(key, normalizedValue);
      }
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};
