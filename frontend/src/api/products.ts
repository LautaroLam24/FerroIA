import { http } from './http';

export interface ApiProduct {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: string;
  stock: number;
  stockMin: number;
  categoryId: string;
  supplierId: string;
  category: { id: string; name: string };
  supplier: { id: string; name: string };
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  code: string;
  description?: string;
  price: number;
  stock: number;
  stockMin: number;
  categoryId: string;
  supplierId: string;
}

export interface UpdateProductInput {
  name?: string;
  code?: string;
  description?: string;
  price?: number;
  stock?: number;
  stockMin?: number;
  categoryId?: string;
  supplierId?: string;
}

export interface ProductQuery {
  name?: string;
  code?: string;
  categoryId?: string;
  supplierId?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  data: ApiProduct[];
  meta: { total: number; page: number; pageSize: number };
}

export function listProducts(query: ProductQuery = {}): Promise<ProductListResult> {
  const params = new URLSearchParams();
  if (query.name) {
    params.set('name', query.name);
  }
  if (query.code) {
    params.set('code', query.code);
  }
  if (query.categoryId) {
    params.set('categoryId', query.categoryId);
  }
  if (query.supplierId) {
    params.set('supplierId', query.supplierId);
  }
  if (query.lowStock !== undefined) {
    params.set('lowStock', String(query.lowStock));
  }
  if (query.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }
  const queryString = params.toString();
  return http.getFull<ProductListResult>(
    `/products${queryString ? `?${queryString}` : ''}`,
  );
}

export function createProduct(input: CreateProductInput): Promise<ApiProduct> {
  return http.post<ApiProduct>('/products', input);
}

export function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ApiProduct> {
  return http.patch<ApiProduct>(`/products/${id}`, input);
}

export function deleteProduct(id: string): Promise<void> {
  return http.delete<void>(`/products/${id}`);
}
