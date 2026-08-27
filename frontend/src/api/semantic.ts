import { http } from './http';
import type { ApiProduct } from './products';

export interface SemanticSearchResult {
  data: ApiProduct[];
  message?: string;
}

export function searchProductsSemantic(q: string): Promise<SemanticSearchResult> {
  return http.getFull<SemanticSearchResult>(
    `/products/semantic?q=${encodeURIComponent(q)}`,
  );
}

export interface RestockItem {
  productId: string;
  code: string;
  name: string;
  currentStock: number;
  stockMin: number;
  suggestedQuantity: number;
}

export interface RestockGroup {
  supplierId: string;
  supplierName: string;
  items: RestockItem[];
}

export interface RestockSuggestion {
  totalProducts: number;
  groups: RestockGroup[];
  summary: string;
}

export function suggestRestock(): Promise<RestockSuggestion> {
  return http.post<RestockSuggestion>('/restock/suggest');
}
