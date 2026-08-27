import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      fields: { stockMin: 'stockMin' };
    };
    category: { findUnique: jest.Mock };
    supplier: { findUnique: jest.Mock };
  };
  let eventEmitter: { emit: jest.Mock };

  const product = {
    id: 'prod-1',
    name: 'Martillo',
    code: 'MART-001',
    price: new Prisma.Decimal('1500.00'),
    stock: 10,
    stockMin: 2,
    categoryId: 'cat-1',
    supplierId: 'sup-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 'cat-1', name: 'Herramientas' },
    supplier: { id: 'sup-1', name: 'Ferreterías SA' },
  };

  const expectedSelect = {
    id: true,
    name: true,
    code: true,
    description: true,
    price: true,
    stock: true,
    stockMin: true,
    categoryId: true,
    supplierId: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true } },
    supplier: { select: { id: true, name: true } },
  };

  const createDto = {
    name: 'Martillo',
    code: 'MART-001',
    price: 1500,
    stock: 10,
    stockMin: 2,
    categoryId: 'cat-1',
    supplierId: 'sup-1',
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        fields: { stockMin: 'stockMin' as const },
      },
      category: { findUnique: jest.fn() },
      supplier: { findUnique: jest.fn() },
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('creates the product, emits product.created and returns it', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1' });
      prisma.product.create.mockResolvedValue(product);

      const result = await service.create(createDto);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          code: createDto.code,
          price: createDto.price,
          stock: createDto.stock,
          stockMin: createDto.stockMin,
          categoryId: createDto.categoryId,
          supplierId: createDto.supplierId,
        },
        select: expectedSelect,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('product.created', {
        id: product.id,
      });
      expect(result).toEqual(product);
    });

    it('throws ConflictException when the code is already in use', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when Prisma raises P2002 (race)', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1' });
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        { code: 'P2002', clientVersion: '6' },
      );
      prisma.product.create.mockRejectedValue(p2002);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException when the category does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the supplier does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prisma.supplier.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const listable = [
      { ...product, stock: 10, stockMin: 2 },
      { ...product, id: 'prod-2', stock: 1, stockMin: 5 },
    ];

    function mockPaged(): void {
      prisma.product.count.mockResolvedValue(2);
      prisma.product.findMany.mockResolvedValue(listable);
    }

    it('devuelve items con lowStock calculado, total y defaults de paginación', async () => {
      mockPaged();

      const result = await service.findAll({});

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          skip: 0,
          take: 10,
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.items[0].lowStock).toBe(false);
      expect(result.items[1].lowStock).toBe(true);
    });

    it('filtra por name con contains case-insensitive', async () => {
      mockPaged();

      await service.findAll({ name: 'martillo' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            name: { contains: 'martillo', mode: 'insensitive' },
          },
        }),
      );
    });

    it('filtra por code exacto', async () => {
      mockPaged();

      await service.findAll({ code: 'MART-001' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, code: 'MART-001' },
        }),
      );
    });

    it('filtra por categoryId', async () => {
      mockPaged();

      await service.findAll({ categoryId: 'cat-1' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, categoryId: 'cat-1' },
        }),
      );
    });

    it('filtra por supplierId', async () => {
      mockPaged();

      await service.findAll({ supplierId: 'sup-1' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, supplierId: 'sup-1' },
        }),
      );
    });

    it('filtra por lowStock=true comparando stock con stockMin', async () => {
      mockPaged();

      await service.findAll({ lowStock: 'true' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            stock: { lte: 'stockMin' },
          },
        }),
      );
    });

    it('no aplica el filtro lowStock cuando es false', async () => {
      mockPaged();

      await service.findAll({ lowStock: 'false' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('combina dos filtros', async () => {
      mockPaged();

      await service.findAll({ name: 'pintura', lowStock: 'true' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            name: { contains: 'pintura', mode: 'insensitive' },
            stock: { lte: 'stockMin' },
          },
        }),
      );
    });

    it('aplica skip y take según page y pageSize', async () => {
      mockPaged();

      await service.findAll({ page: 3, pageSize: 5 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(prisma.product.count).toHaveBeenCalledTimes(1);
    });

    it('mantiene la exclusión de deletedAt en toda combinación de filtros', async () => {
      mockPaged();

      await service.findAll({ code: 'X', categoryId: 'cat-1' });

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          code: 'X',
          categoryId: 'cat-1',
        },
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            code: 'X',
            categoryId: 'cat-1',
          },
        }),
      );
    });
  });

  describe('update', () => {
    it('updates the product and emits product.updated', async () => {
      prisma.product.findFirst.mockResolvedValueOnce({ id: product.id });
      prisma.product.update.mockResolvedValue({
        ...product,
        price: new Prisma.Decimal('1600.00'),
      });

      const result = await service.update(product.id, { price: 1600 });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: product.id },
        data: { price: 1600 },
        select: expectedSelect,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('product.updated', {
        id: product.id,
      });
      expect(result.price.toString()).toBe('1600');
    });

    it('throws NotFoundException when the product does not exist or is deleted', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(null);

      await expect(service.update('missing', { price: 100 })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the new code belongs to another product', async () => {
      prisma.product.findFirst
        .mockResolvedValueOnce({ id: product.id })
        .mockResolvedValueOnce({ id: 'other' });

      await expect(
        service.update(product.id, { code: 'OTRO-COD' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the new category does not exist', async () => {
      prisma.product.findFirst.mockResolvedValueOnce({ id: product.id });
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update(product.id, { categoryId: 'missing-cat' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('sets deletedAt and emits product.deleted', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: product.id });
      prisma.product.update.mockResolvedValue({
        ...product,
        deletedAt: new Date(),
      });

      await service.remove(product.id);

      const updateCall = prisma.product.update.mock.calls[0] as [
        { where: { id: string }; data: { deletedAt: Date } },
      ];
      expect(updateCall[0].where).toEqual({ id: product.id });
      expect(updateCall[0].data.deletedAt).toBeInstanceOf(Date);
      expect(eventEmitter.emit).toHaveBeenCalledWith('product.deleted', {
        id: product.id,
      });
    });

    it('throws NotFoundException when the product does not exist or is already deleted', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });
});
