import { http } from './http';

export type StockMovementType = 'ENTRADA' | 'VENTA';

export interface ApiStockMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  date: string;
  productId: string;
  userId: string;
  product: { id: string; name: string; code: string };
}

export interface CreateEntryInput {
  productId: string;
  quantity: number;
  reason: string;
  date?: string;
}

export interface CreateSaleInput {
  productId: string;
  quantity: number;
  reason?: string;
  date?: string;
}

export interface ListMovementsFilters {
  productId?: string;
  from?: string;
  to?: string;
}

function buildQuery(filters: ListMovementsFilters): string {
  const params = new URLSearchParams();
  if (filters.productId) params.set('productId', filters.productId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function createStockEntry(
  input: CreateEntryInput,
): Promise<ApiStockMovement> {
  return http.post<ApiStockMovement>('/stock/entries', input);
}

export function createStockSale(
  input: CreateSaleInput,
): Promise<ApiStockMovement> {
  return http.post<ApiStockMovement>('/stock/sales', input);
}

export function listMovements(
  filters: ListMovementsFilters = {},
): Promise<ApiStockMovement[]> {
  return http.get<ApiStockMovement[]>(`/stock/movements${buildQuery(filters)}`);
}
