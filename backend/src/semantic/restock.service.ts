import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  RestockSummaryGroup,
  SemanticIndexService,
} from './semantic-index.service';

const DEFAULT_PERIOD_DAYS = 30;
const DEFAULT_LEAD_DAYS = 15;
const NO_RESTOCK_NEEDED_SUMMARY =
  'No hay productos bajo el stock mínimo en este momento; no se requiere reposición.';

export interface RestockSuggestionItem {
  productId: string;
  code: string;
  name: string;
  currentStock: number;
  stockMin: number;
  suggestedQuantity: number;
}

export interface RestockSuggestionGroup {
  supplierId: string;
  supplierName: string;
  items: RestockSuggestionItem[];
}

export interface RestockSuggestion {
  totalProducts: number;
  groups: RestockSuggestionGroup[];
  summary: string;
}

@Injectable()
export class RestockService {
  private readonly logger = new Logger(RestockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly semanticIndexService: SemanticIndexService,
  ) {}

  async suggest(): Promise<RestockSuggestion> {
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        stock: { lte: this.prisma.product.fields.stockMin },
      },
      select: {
        id: true,
        code: true,
        name: true,
        stock: true,
        stockMin: true,
        supplier: { select: { id: true, name: true } },
      },
    });

    if (lowStockProducts.length === 0) {
      return {
        totalProducts: 0,
        groups: [],
        summary: NO_RESTOCK_NEEDED_SUMMARY,
      };
    }

    const periodDays =
      Number(this.configService.get<string>('RESTOCK_PERIOD_DAYS')) ||
      DEFAULT_PERIOD_DAYS;
    const leadDays =
      Number(this.configService.get<string>('RESTOCK_LEAD_DAYS')) ||
      DEFAULT_LEAD_DAYS;
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const consumption = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: {
        productId: { in: lowStockProducts.map((product) => product.id) },
        type: StockMovementType.VENTA,
        date: { gte: periodStart },
      },
      _sum: { quantity: true },
    });
    const soldByProductId = new Map(
      consumption.map((row) => [row.productId, row._sum.quantity ?? 0]),
    );

    const groupsBySupplier = new Map<string, RestockSuggestionGroup>();
    for (const product of lowStockProducts) {
      const totalSold = soldByProductId.get(product.id) ?? 0;
      const avgDailyConsumption = totalSold / periodDays;
      const suggestedQuantity = Math.max(
        Math.ceil(avgDailyConsumption * leadDays),
        product.stockMin - product.stock,
        1,
      );

      const item: RestockSuggestionItem = {
        productId: product.id,
        code: product.code,
        name: product.name,
        currentStock: product.stock,
        stockMin: product.stockMin,
        suggestedQuantity,
      };

      const existing = groupsBySupplier.get(product.supplier.id);
      if (existing) {
        existing.items.push(item);
      } else {
        groupsBySupplier.set(product.supplier.id, {
          supplierId: product.supplier.id,
          supplierName: product.supplier.name,
          items: [item],
        });
      }
    }

    const groups = Array.from(groupsBySupplier.values());
    const summary = await this.summarize(groups, lowStockProducts.length);

    return { totalProducts: lowStockProducts.length, groups, summary };
  }

  private async summarize(
    groups: RestockSuggestionGroup[],
    totalProducts: number,
  ): Promise<string> {
    const groupsForSummary: RestockSummaryGroup[] = groups.map((group) => ({
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      items: group.items.map((item) => ({
        code: item.code,
        name: item.name,
        suggestedQuantity: item.suggestedQuantity,
      })),
    }));

    try {
      return await this.semanticIndexService.summarizeRestock(
        groupsForSummary,
        totalProducts,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo redactar el resumen de reposición con el LLM: ${(error as Error).message}`,
      );
      return `Hay ${totalProducts} producto(s) bajo el stock mínimo, distribuidos en ${groups.length} proveedor(es). El resumen narrativo no está disponible en este momento.`;
    }
  }
}
