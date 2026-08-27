import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: {
    supplier: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    product: { count: jest.Mock };
  };

  const supplier = {
    id: 'sup-1',
    name: 'Andrés Pinturas',
    contact: 'andres@mail.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const expectedSelect = {
    id: true,
    name: true,
    contact: true,
    createdAt: true,
    updatedAt: true,
  };

  beforeEach(async () => {
    prisma = {
      supplier: {
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
        SuppliersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  describe('create', () => {
    it('creates the supplier with contact and returns it', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);
      prisma.supplier.create.mockResolvedValue(supplier);

      const result = await service.create({
        name: 'Andrés Pinturas',
        contact: 'andres@mail.com',
      });

      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: { name: 'Andrés Pinturas', contact: 'andres@mail.com' },
        select: expectedSelect,
      });
      expect(result).toEqual(supplier);
    });

    it('creates the supplier without contact', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);
      prisma.supplier.create.mockResolvedValue({ ...supplier, contact: null });

      const result = await service.create({ name: 'Ferretería El Tornillo' });

      const createCall = prisma.supplier.create.mock.calls as Array<
        [{ data: { name: string; contact?: string } }]
      >;
      expect(createCall[0][0].data).toEqual({
        name: 'Ferretería El Tornillo',
      });
      expect(result.contact).toBeNull();
    });

    it('throws ConflictException when the name is already in use', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create({ name: 'Andrés Pinturas' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.supplier.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when Prisma raises P2002 (race)', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        { code: 'P2002', clientVersion: '6' },
      );
      prisma.supplier.create.mockRejectedValue(p2002);

      await expect(service.create({ name: 'Andrés Pinturas' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('returns suppliers with productCount of active products', async () => {
      prisma.supplier.findMany.mockResolvedValue([
        { ...supplier, _count: { products: 2 } },
        {
          ...supplier,
          id: 'sup-2',
          name: 'Ferretería El Tornillo',
          contact: null,
          _count: { products: 0 },
        },
      ]);

      const result = await service.findAll();

      const findManyCall = prisma.supplier.findMany.mock.calls as Array<
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
        { ...supplier, productCount: 2 },
        {
          ...supplier,
          id: 'sup-2',
          name: 'Ferretería El Tornillo',
          contact: null,
          productCount: 0,
        },
      ]);
      expect(result[0]).not.toHaveProperty('_count');
    });
  });

  describe('update', () => {
    it('updates the contact and returns the supplier', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: supplier.id });
      prisma.supplier.update.mockResolvedValue({
        ...supplier,
        contact: 'nuevo@mail.com',
      });

      const result = await service.update(supplier.id, {
        contact: 'nuevo@mail.com',
      });

      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: supplier.id },
        data: { contact: 'nuevo@mail.com' },
        select: expectedSelect,
      });
      expect(result.contact).toBe('nuevo@mail.com');
    });

    it('allows clearing the contact with null', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: supplier.id });
      prisma.supplier.update.mockResolvedValue({ ...supplier, contact: null });

      const result = await service.update(supplier.id, { contact: null });

      const updateCall = prisma.supplier.update.mock.calls as Array<
        [{ data: { contact: string | null } }]
      >;
      expect(updateCall[0][0].data).toEqual({ contact: null });
      expect(result.contact).toBeNull();
    });

    it('throws NotFoundException when the supplier does not exist', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { contact: 'x@y.com' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.supplier.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the new name belongs to another supplier', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: supplier.id });
      prisma.supplier.findFirst.mockResolvedValue({ id: 'other' });

      await expect(
        service.update(supplier.id, { name: 'Otro' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.supplier.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the supplier and returns nothing', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: supplier.id });
      prisma.product.count.mockResolvedValue(0);
      prisma.supplier.delete.mockResolvedValue(supplier);

      await service.remove(supplier.id);

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { supplierId: supplier.id },
      });
      expect(prisma.supplier.delete).toHaveBeenCalledWith({
        where: { id: supplier.id },
      });
    });

    it('throws NotFoundException when the supplier does not exist', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.supplier.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the supplier has associated products', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: supplier.id });
      prisma.product.count.mockResolvedValue(1);

      await expect(service.remove(supplier.id)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.supplier.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when Prisma raises P2003 (FK race)', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: supplier.id });
      prisma.product.count.mockResolvedValue(0);
      const p2003 = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint violated',
        { code: 'P2003', clientVersion: '6' },
      );
      prisma.supplier.delete.mockRejectedValue(p2003);

      await expect(service.remove(supplier.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
