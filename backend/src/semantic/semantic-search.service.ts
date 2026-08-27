import { BadGatewayException, Injectable } from '@nestjs/common';
import { ListableProduct, ProductsService } from '../products/products.service';
import { SemanticIndexService } from './semantic-index.service';

const SEMANTIC_SEARCH_UNAVAILABLE =
  'La búsqueda semántica no está disponible en este momento';

@Injectable()
export class SemanticSearchService {
  constructor(
    private readonly semanticIndexService: SemanticIndexService,
    private readonly productsService: ProductsService,
  ) {}

  async search(q: string): Promise<ListableProduct[]> {
    let results;
    try {
      results = await this.semanticIndexService.search(q);
    } catch {
      throw new BadGatewayException(SEMANTIC_SEARCH_UNAVAILABLE);
    }

    if (results.length === 0) {
      return [];
    }

    const products = await this.productsService.findByIds(
      results.map((result) => result.id),
    );
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    return results
      .map((result) => productById.get(result.id))
      .filter((product): product is ListableProduct => product !== undefined);
  }
}
