import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const alertSelect = {
  id: true,
  code: true,
  name: true,
  stock: true,
  stockMin: true,
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.ProductSelect;

const recentMovementSelect = {
  id: true,
  type: true,
  quantity: true,
  reason: true,
  date: true,
  product: { select: { id: true, name: true, code: true } },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.StockMovementSelect;

type Alert = Prisma.ProductGetPayload<{ select: typeof alertSelect }>;
type RecentMovement = Prisma.StockMovementGetPayload<{
  select: typeof recentMovementSelect;
}>;

interface InventoryValueRow {
  total: number;
}

export interface DashboardSummary {
  alerts: Alert[];
  totalInventoryValue: number;
  recentMovements: RecentMovement[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummary> {
    const [alerts, valueRows, recentMovements] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          deletedAt: null,
          stock: { lte: this.prisma.product.fields.stockMin },
        },
        orderBy: { stock: 'asc' },
        select: alertSelect,
      }),
      this.prisma.$queryRaw<InventoryValueRow[]>`
        SELECT COALESCE(SUM("price" * stock), 0)::float8 AS "total"
        FROM "products"
        WHERE "deletedAt" IS NULL
      `,
      this.prisma.stockMovement.findMany({
        take: 10,
        orderBy: { date: 'desc' },
        select: recentMovementSelect,
      }),
    ]);

    return {
      alerts,
      totalInventoryValue: Number(valueRows[0]?.total ?? 0),
      recentMovements,
    };
  }
}
