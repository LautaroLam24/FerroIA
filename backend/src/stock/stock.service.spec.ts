import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from './stock.service';

describe('StockService', () => {
  let service: StockService;
  let tx: {
    product: { updateMany: jest.Mock; findUnique: jest.Mock };
    stockMovement: { create: jest.Mock };
  };
  let prisma: {
    $transaction: jest.Mock;
    stockMovement: { findMany: jest.Mock };
  };

  const userId = 'user-1';
  const productId = 'prod-1';

  const expectedSelect = {
    id: true,
    type: true,
    quantity: true,
    reason: true,
    date: true,
    productId: true,
    userId: true,
    product: { select: { id: true, name: true, code: true } },
  };

  const movement = {
    id: 'move-1',
    type: StockMovementType.ENTRADA,
    quantity: 5,
    reason: 'Reposición',
    date: new Date(),
    productId,
    userId,
    product: { id: productId, name: 'Martillo', code: 'MART-001' },
  };

  beforeEach(async () => {
    tx = {
      product: { updateMany: jest.fn(), findUnique: jest.fn() },
      stockMovement: { create: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
      stockMovement: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StockService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  describe('createEntry', () => {
    it('increments stock and creates an ENTRADA movement', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.stockMovement.create.mockResolvedValue(movement);

      const result = await service.createEntry(
        { productId, quantity: 5, reason: 'Reposición' },
        userId,
      );

      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: productId, deletedAt: null },
        data: { stock: { increment: 5 } },
      });
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: {
          type: StockMovementType.ENTRADA,
          quantity: 5,
          productId,
          userId,
          reason: 'Reposición',
        },
        select: expectedSelect,
      });
      expect(result).toEqual(movement);
    });

    it('throws NotFoundException when the product does not exist', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      tx.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createEntry({ productId, quantity: 5, reason: 'x' }, userId),
      ).rejects.toThrow(NotFoundException);
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the product is deleted', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      tx.product.findUnique.mockResolvedValue({ deletedAt: new Date() });

      await expect(
        service.createEntry({ productId, quantity: 5, reason: 'x' }, userId),
      ).rejects.toThrow(ConflictException);
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('createSale', () => {
    it('decrements stock and creates a VENTA movement', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.stockMovement.create.mockResolvedValue({
        ...movement,
        type: StockMovementType.VENTA,
      });

      const result = await service.createSale(
        { productId, quantity: 3 },
        userId,
      );

      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: productId, deletedAt: null, stock: { gte: 3 } },
        data: { stock: { increment: -3 } },
      });
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: {
          type: StockMovementType.VENTA,
          quantity: 3,
          productId,
          userId,
        },
        select: expectedSelect,
      });
      expect(result.type).toBe(StockMovementType.VENTA);
    });

    it('throws ConflictException "Stock insuficiente" when the product is active but stock is too low', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      tx.product.findUnique.mockResolvedValue({ deletedAt: null });

      await expect(
        service.createSale({ productId, quantity: 100 }, userId),
      ).rejects.toThrow(ConflictException);
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the product does not exist', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      tx.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createSale({ productId, quantity: 1 }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the product is deleted', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      tx.product.findUnique.mockResolvedValue({ deletedAt: new Date() });

      await expect(
        service.createSale({ productId, quantity: 1 }, userId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('lists movements ordered by date descending without filters', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([movement]);

      const result = await service.findAll({});

      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { date: 'desc' },
        select: expectedSelect,
      });
      expect(result).toEqual([movement]);
    });

    it('filters by productId', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([]);

      await service.findAll({ productId });

      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId } }),
      );
    });

    it('filters by date range', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([]);

      await service.findAll({ from: '2026-01-01', to: '2026-01-31' });

      const call = prisma.stockMovement.findMany.mock.calls[0] as [
        { where: { date: { gte: Date; lte: Date } } },
      ];
      expect(call[0].where.date.gte).toEqual(new Date('2026-01-01'));
      expect(call[0].where.date.lte).toEqual(new Date('2026-01-31'));
    });
  });
});
