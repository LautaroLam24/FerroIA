import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IndexableProduct {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  supplier: string;
}

export interface SemanticSearchResult {
  id: string;
  score: number;
}

export interface RestockSummaryItem {
  code: string;
  name: string;
  suggestedQuantity: number;
}

export interface RestockSummaryGroup {
  supplierId: string;
  supplierName: string;
  items: RestockSummaryItem[];
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Cliente HTTP hacia el servicio Python de `chatbot` (mismo proceso que
 * atiende CU09, extendido con endpoints de indexación/búsqueda semántica y
 * de redacción del resumen de reposición). Reusa `CHATBOT_URL`/
 * `CHATBOT_TIMEOUT_MS` en vez de declarar una URL/puerto nuevos.
 */
@Injectable()
export class SemanticIndexService {
  constructor(private readonly configService: ConfigService) {}

  private baseUrl(): string {
    return this.configService.get<string>('CHATBOT_URL') ?? '';
  }

  private timeoutMs(): number {
    return (
      Number(this.configService.get<string>('CHATBOT_TIMEOUT_MS')) ||
      DEFAULT_TIMEOUT_MS
    );
  }

  private request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl()}${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.timeoutMs()),
    });
  }

  async indexProduct(product: IndexableProduct): Promise<void> {
    const response = await this.request('/products/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      throw new Error(
        `Fallo al indexar el producto ${product.id}: ${response.status}`,
      );
    }
  }

  async removeFromIndex(id: string): Promise<void> {
    const response = await this.request(
      `/products/index/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      throw new Error(
        `Fallo al quitar el producto ${id} del índice: ${response.status}`,
      );
    }
  }

  async reindexBulk(products: IndexableProduct[]): Promise<number> {
    const response = await this.request('/products/index/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    });
    if (!response.ok) {
      throw new Error(`Falló el reindexado completo: ${response.status}`);
    }
    const body = (await response.json()) as { indexed: number };
    return body.indexed;
  }

  async search(q: string): Promise<SemanticSearchResult[]> {
    const response = await this.request(
      `/products/search?q=${encodeURIComponent(q)}`,
    );
    if (!response.ok) {
      throw new Error(`Falló la búsqueda semántica: ${response.status}`);
    }
    const body = (await response.json()) as {
      results: SemanticSearchResult[];
    };
    return body.results;
  }

  async summarizeRestock(
    groups: RestockSummaryGroup[],
    totalProducts: number,
  ): Promise<string> {
    const response = await this.request('/restock/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups, totalProducts }),
    });
    if (!response.ok) {
      throw new Error(`Falló la redacción del resumen: ${response.status}`);
    }
    const body = (await response.json()) as { summary: string };
    return body.summary;
  }
}
