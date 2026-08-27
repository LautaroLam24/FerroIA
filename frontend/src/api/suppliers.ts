import { http } from './http';

export interface ApiSupplier {
  id: string;
  name: string;
  contact: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  name: string;
  contact?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  contact?: string | null;
}

export function listSuppliers(): Promise<ApiSupplier[]> {
  return http.get<ApiSupplier[]>('/suppliers');
}

export function createSupplier(input: CreateSupplierInput): Promise<ApiSupplier> {
  return http.post<ApiSupplier>('/suppliers', input);
}

export function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
): Promise<ApiSupplier> {
  return http.patch<ApiSupplier>(`/suppliers/${id}`, input);
}

export function deleteSupplier(id: string): Promise<void> {
  return http.delete<void>(`/suppliers/${id}`);
}
