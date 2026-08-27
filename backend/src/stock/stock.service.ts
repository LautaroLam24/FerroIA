import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';

const movementSelect = {
  id: true,
  type: true,
  quantity: true,
  reason: true,
  date: true,
  productId: true,
  userId: true,
  product: { select: { id: true, name: true, code: true } },
} satisfies Prisma.StockMovementSelect;

type PublicMovement = Prisma.StockMovementGetPayload<{
  select: typeof movementSelect;
}>;

const PRODUCT_NOT_FOUND = 'Producto no encontrado';
const PRODUCT_DELETED = 'El producto está dado de baja';
const INSUFFICIENT_STOCK = 'Stock insuficiente';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async createEntry(
    dto: CreateEntryDto,
    userId: string,
  ): Promise<PublicMovement> {
    return this.applyMovement(
      dto.productId,
      dto.quantity,
      StockMovementType.ENTRADA,
      1,
      userId,
      dto.reason,
      dto.date,
    );
  }

  async createSale(
    dto: CreateSaleDto,
    userId: string,
  ): Promise<PublicMovement> {
    return this.applyMovement(
      dto.productId,
      dto.quantity,
      StockMovementType.VENTA,
      -1,
      userId,
      dto.reason,
      dto.date,
    );
  }

  private async applyMovement(
    productId: string,
    quantity: number,
    type: StockMovementType,
    sign: 1 | -1,
    userId: string,
    reason: string | undefined,
    date: string | undefined,
  ): Promise<PublicMovement> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.product.updateMany({
        where: {
          id: productId,
          deletedAt: null,
          ...(sign < 0 && { stock: { gte: quantity } }),
        },
        data: {
          stock: { increment: sign * quantity },
        },
      });

      if (result.count === 0) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { deletedAt: true },
        });
        if (!product) {
          throw new NotFoundException(PRODUCT_NOT_FOUND);
        }
        if (product.deletedAt !== null) {
          throw new ConflictException(PRODUCT_DELETED);
        }
        throw new ConflictException(INSUFFICIENT_STOCK);
      }

      return tx.stockMovement.create({
        data: {
          type,
          quantity,
          productId,
          userId,
          ...(reason !== undefined && { reason }),
          ...(date !== undefined && { date: new Date(date) }),
        },
        select: movementSelect,
      });
    });
  }

  async findAll(query: ListMovementsQueryDto): Promise<PublicMovement[]> {
    return this.prisma.stockMovement.findMany({
      where: {
        ...(query.productId !== undefined && { productId: query.productId }),
        ...((query.from !== undefined || query.to !== undefined) && {
          date: {
            ...(query.from !== undefined && { gte: new Date(query.from) }),
            ...(query.to !== undefined && { lte: new Date(query.to) }),
          },
        }),
      },
      orderBy: { date: 'desc' },
      select: movementSelect,
    });
  }
}
