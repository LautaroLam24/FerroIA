import { http } from './http';

export interface ApiCategory {
  id: string;
  name: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
}

export interface UpdateCategoryInput {
  name?: string;
}

export function listCategories(): Promise<ApiCategory[]> {
  return http.get<ApiCategory[]>('/categories');
}

export function createCategory(input: CreateCategoryInput): Promise<ApiCategory> {
  return http.post<ApiCategory>('/categories', input);
}

export function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<ApiCategory> {
  return http.patch<ApiCategory>(`/categories/${id}`, input);
}

export function deleteCategory(id: string): Promise<void> {
  return http.delete<void>(`/categories/${id}`);
}
