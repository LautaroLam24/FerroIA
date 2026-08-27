import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrdenCompraEstado, OrdenCompraOrigen } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let prisma: {
    supplier: { findUnique: jest.Mock };
    product: { findMany: jest.Mock };
    ordenCompra: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const userId = 'user-1';
  const proveedorId = 'supplier-1';
  const productoId = 'product-1';

  const dto = {
    proveedorId,
    items: [{ productoId, cantidadSugerida: 10 }],
  };

  const expectedSelect = {
    id: true,
    estado: true,
    origen: true,
    createdBy: true,
    createdAt: true,
    proveedor: { select: { id: true, name: true } },
    items: {
      select: {
        id: true,
        cantidadSugerida: true,
        producto: { select: { id: true, code: true, name: true } },
      },
    },
  };

  const order = {
    id: 'order-1',
    estado: OrdenCompraEstado.BORRADOR,
    origen: OrdenCompraOrigen.MANUAL,
    createdBy: userId,
    createdAt: new Date(),
    proveedor: { id: proveedorId, name: 'Proveedor 1' },
    items: [
      {
        id: 'item-1',
        cantidadSugerida: 10,
        producto: { id: productoId, code: 'COD-1', name: 'Producto 1' },
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      supplier: { findUnique: jest.fn() },
      product: { findMany: jest.fn() },
      ordenCompra: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  describe('create', () => {
    it('crea la orden en BORRADOR con el origen recibido como parámetro', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: proveedorId });
      prisma.product.findMany.mockResolvedValue([{ id: productoId }]);
      prisma.ordenCompra.create.mockResolvedValue(order);

      const result = await service.create(
        dto,
        userId,
        OrdenCompraOrigen.MANUAL,
      );

      expect(prisma.ordenCompra.create).toHaveBeenCalledWith({
        data: {
          proveedorId,
          createdBy: userId,
          origen: OrdenCompraOrigen.MANUAL,
          estado: OrdenCompraEstado.BORRADOR,
          items: {
            create: [{ productoId, cantidadSugerida: 10 }],
          },
        },
        select: expectedSelect,
      });
      expect(result).toEqual(order);
    });

    it('crea la orden con origen ASISTENTE cuando se lo pasan explícitamente', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: proveedorId });
      prisma.product.findMany.mockResolvedValue([{ id: productoId }]);
      prisma.ordenCompra.create.mockResolvedValue({
        ...order,
        origen: OrdenCompraOrigen.ASISTENTE,
      });

      await service.create(dto, userId, OrdenCompraOrigen.ASISTENTE);

      expect(prisma.ordenCompra.create).toHaveBeenCalledWith({
        data: {
          proveedorId,
          createdBy: userId,
          origen: OrdenCompraOrigen.ASISTENTE,
          estado: OrdenCompraEstado.BORRADOR,
          items: {
            create: [{ productoId, cantidadSugerida: 10 }],
          },
        },
        select: expectedSelect,
      });
    });

    it('lanza BadRequestException si el proveedor no existe', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dto, userId, OrdenCompraOrigen.MANUAL),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.ordenCompra.create).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si algún producto no existe', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: proveedorId });
      prisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.create(dto, userId, OrdenCompraOrigen.MANUAL),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.ordenCompra.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll / findOne', () => {
    it('lista las órdenes ordenadas por createdAt descendente', async () => {
      prisma.ordenCompra.findMany.mockResolvedValue([order]);

      const result = await service.findAll();

      expect(prisma.ordenCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
      expect(result).toEqual([order]);
    });

    it('devuelve una orden existente', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(order);

      const result = await service.findOne(order.id);

      expect(result).toEqual(order);
    });

    it('lanza NotFoundException si la orden no existe', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirmar', () => {
    it('transiciona BORRADOR -> CONFIRMADA sin tocar stock ni movimientos', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue({
        estado: OrdenCompraEstado.BORRADOR,
      });
      prisma.ordenCompra.update.mockResolvedValue({
        ...order,
        estado: OrdenCompraEstado.CONFIRMADA,
      });

      const result = await service.confirmar(order.id);

      expect(prisma.ordenCompra.update).toHaveBeenCalledWith({
        where: { id: order.id },
        data: { estado: OrdenCompraEstado.CONFIRMADA },
        select: expectedSelect,
      });
      expect(result.estado).toBe(OrdenCompraEstado.CONFIRMADA);
      // El mock de Prisma no expone product/stockMovement: si el service
      // intentara tocarlos, esta prueba fallaría con un TypeError.
    });

    it('lanza NotFoundException si la orden no existe', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue(null);

      await expect(service.confirmar('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.ordenCompra.update).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si la orden no está en BORRADOR', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue({
        estado: OrdenCompraEstado.CONFIRMADA,
      });

      await expect(service.confirmar(order.id)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.ordenCompra.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    it('transiciona BORRADOR -> CANCELADA', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue({
        estado: OrdenCompraEstado.BORRADOR,
      });
      prisma.ordenCompra.update.mockResolvedValue({
        ...order,
        estado: OrdenCompraEstado.CANCELADA,
      });

      const result = await service.cancelar(order.id);

      expect(prisma.ordenCompra.update).toHaveBeenCalledWith({
        where: { id: order.id },
        data: { estado: OrdenCompraEstado.CANCELADA },
        select: expectedSelect,
      });
      expect(result.estado).toBe(OrdenCompraEstado.CANCELADA);
    });

    it('lanza ConflictException si la orden no está en BORRADOR', async () => {
      prisma.ordenCompra.findUnique.mockResolvedValue({
        estado: OrdenCompraEstado.CANCELADA,
      });

      await expect(service.cancelar(order.id)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.ordenCompra.update).not.toHaveBeenCalled();
    });
  });
});
