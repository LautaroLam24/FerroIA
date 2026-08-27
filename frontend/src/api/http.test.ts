import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, ApiError } from './http';
import { setToken, clearToken } from './token';

describe('http client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds the Bearer token when one is stored', async () => {
    setToken('abc123');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await http.get('/products');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('omits the Authorization header when there is no token', async () => {
    clearToken();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await http.get('/products');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('throws ApiError with the backend error message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Stock insuficiente' }), { status: 409 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(http.post('/stock/venta', {})).rejects.toThrow(ApiError);
  });

  it('getFull returns the entire body including data and meta', async () => {
    const body = {
      data: [{ id: '1' }],
      meta: { total: 1, page: 1, pageSize: 10 },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await http.getFull('/products');

    expect(result).toEqual(body);
  });
});
