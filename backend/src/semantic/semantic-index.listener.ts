import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  IndexableProduct,
  SemanticIndexService,
} from './semantic-index.service';

interface ProductEventPayload {
  id: string;
}

/**
 * Sincroniza el índice semántico con el ciclo de vida de productos
 * (`gestion-productos`). Nunca relanza errores: `ProductsService` emite los
 * eventos de forma fire-and-forget, así que un fallo acá no debe afectar la
 * respuesta HTTP del alta/edición/baja ni generar un unhandled rejection.
 */
@Injectable()
export class SemanticIndexListener {
  private readonly logger = new Logger(SemanticIndexListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly semanticIndexService: SemanticIndexService,
  ) {}

  @OnEvent('product.created')
  async onProductCreated(payload: ProductEventPayload): Promise<void> {
    await this.indexSafely(payload.id);
  }

  @OnEvent('product.updated')
  async onProductUpdated(payload: ProductEventPayload): Promise<void> {
    await this.indexSafely(payload.id);
  }

  @OnEvent('product.deleted')
  async onProductDeleted(payload: ProductEventPayload): Promise<void> {
    try {
      await this.semanticIndexService.removeFromIndex(payload.id);
    } catch (error) {
      this.logger.warn(
        `No se pudo quitar el producto ${payload.id} del índice semántico: ${(error as Error).message}`,
      );
    }
  }

  private async indexSafely(productId: string): Promise<void> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          category: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      });
      if (!product) {
        return;
      }

      const payload: IndexableProduct = {
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description,
        category: product.category.name,
        supplier: product.supplier.name,
      };
      await this.semanticIndexService.indexProduct(payload);
    } catch (error) {
      this.logger.warn(
        `No se pudo indexar el producto ${productId}: ${(error as Error).message}`,
      );
    }
  }
}
