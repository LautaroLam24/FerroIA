import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    product: { count: jest.Mock };
  };

  const category = {
    id: 'cat-1',
    name: 'Pinturas',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const expectedSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('create', () => {
    it('creates the category and returns it', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(category);

      const result = await service.create({ name: 'Pinturas' });

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { name: 'Pinturas' },
        select: { id: true },
      });
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: 'Pinturas' },
        select: expectedSelect,
      });
      expect(result).toEqual(category);
    });

    it('throws ConflictException when the name is already in use', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create({ name: 'Pinturas' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when Prisma raises P2002 (race)', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        { code: 'P2002', clientVersion: '6' },
      );
      prisma.category.create.mockRejectedValue(p2002);

      await expect(service.create({ name: 'Pinturas' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('returns categories with productCount of active products', async () => {
      prisma.category.findMany.mockResolvedValue([
        { ...category, _count: { products: 3 } },
        {
          ...category,
          id: 'cat-2',
          name: 'Esmaltes',
          _count: { products: 0 },
        },
      ]);

      const result = await service.findAll();

      const findManyCall = prisma.category.findMany.mock.calls as Array<
        [
          {
            orderBy: { name: 'asc' };
            select: {
              _count: { select: { products: { where: { deletedAt: null } } } };
            };
          },
        ]
      >;
      const countWhere = findManyCall[0][0].select._count.select.products.where;
      expect(countWhere).toEqual({ deletedAt: null });
      expect(result).toEqual([
        { ...category, productCount: 3 },
        { ...category, id: 'cat-2', name: 'Esmaltes', productCount: 0 },
      ]);
      expect(result[0]).not.toHaveProperty('_count');
    });
  });

  describe('update', () => {
    it('updates the category name and returns it', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: category.id });
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.update.mockResolvedValue({
        ...category,
        name: 'Esmaltes',
      });

      const result = await service.update(category.id, { name: 'Esmaltes' });

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { name: 'Esmaltes', NOT: { id: category.id } },
        select: { id: true },
      });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: category.id },
        data: { name: 'Esmaltes' },
        select: expectedSelect,
      });
      expect(result.name).toBe('Esmaltes');
    });

    it('throws NotFoundException when the category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Esmaltes' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the new name belongs to another category', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: category.id });
      prisma.category.findFirst.mockResolvedValue({ id: 'other' });

      await expect(
        service.update(category.id, { name: 'Esmaltes' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the category and returns nothing', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: category.id });
      prisma.product.count.mockResolvedValue(0);
      prisma.category.delete.mockResolvedValue(category);

      await service.remove(category.id);

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { categoryId: category.id },
      });
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: category.id },
      });
    });

    it('throws NotFoundException when the category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the category has associated products', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: category.id });
      prisma.product.count.mockResolvedValue(2);

      await expect(service.remove(category.id)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when Prisma raises P2003 (FK race)', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: category.id });
      prisma.product.count.mockResolvedValue(0);
      const p2003 = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint violated',
        { code: 'P2003', clientVersion: '6' },
      );
      prisma.category.delete.mockRejectedValue(p2003);

      await expect(service.remove(category.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
