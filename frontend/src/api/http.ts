import { clearToken, clearUser, getToken } from './token';

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

interface ApiSuccess<T> {
  data: T;
}

interface ApiErrorBody {
  error: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await rawRequest(path, options);
  return (response.body as ApiSuccess<T>).data;
}

async function rawRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; body: T | ApiErrorBody }> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  // 204 No Content (DELETE de products/categories/suppliers/users) no manda
  // body: response.json() sobre un body vacío tira SyntaxError, así que ni
  // siquiera llega al chequeo de response.ok de más abajo.
  const body: ApiSuccess<T> | ApiErrorBody =
    response.status === 204
      ? ({ data: undefined as T })
      : ((await response.json()) as ApiSuccess<T> | ApiErrorBody);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    if (response.status === 401 && token) {
      clearToken();
      clearUser();
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw new ApiError(response.status, errorBody.error, errorBody.details);
  }

  return { status: response.status, body };
}

export const http = {
  get: <T>(path: string): Promise<T> => request<T>(path, { method: 'GET' }),
  getFull: <T>(path: string): Promise<T> =>
    rawRequest<T>(path, { method: 'GET' }).then(
      ({ body }) => body as T,
    ),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),
};
