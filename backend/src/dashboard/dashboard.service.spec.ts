import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      fields: { stockMin: 'stockMin' };
    };
    stockMovement: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };

  const lowStockProduct = {
    id: 'prod-1',
    code: 'MART-001',
    name: 'Martillo',
    stock: 0,
    stockMin: 5,
    category: { id: 'cat-1', name: 'Herramientas' },
    supplier: { id: 'sup-1', name: 'Proveedor A' },
  };

  const expectedAlertSelect = {
    id: true,
    code: true,
    name: true,
    stock: true,
    stockMin: true,
    category: { select: { id: true, name: true } },
    supplier: { select: { id: true, name: true } },
  };

  const expectedMovementSelect = {
    id: true,
    type: true,
    quantity: true,
    reason: true,
    date: true,
    product: { select: { id: true, name: true, code: true } },
    user: { select: { id: true, name: true, email: true } },
  };

  const movement = {
    id: 'move-1',
    type: StockMovementType.ENTRADA,
    quantity: 5,
    reason: 'Reposición',
    date: new Date(),
    product: { id: 'prod-1', name: 'Martillo', code: 'MART-001' },
    user: { id: 'user-1', name: 'Admin', email: 'admin@ferreteria.local' },
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        fields: { stockMin: 'stockMin' },
      },
      stockMovement: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('devuelve las tres secciones en una sola respuesta', async () => {
    prisma.product.findMany.mockResolvedValue([lowStockProduct]);
    prisma.$queryRaw.mockResolvedValue([{ total: 1500 }]);
    prisma.stockMovement.findMany.mockResolvedValue([movement]);

    const result = await service.getSummary();

    expect(result.alerts).toEqual([lowStockProduct]);
    expect(result.totalInventoryValue).toBe(1500);
    expect(result.recentMovements).toEqual([movement]);
  });

  it('consulta alertas con stock <= stockMin, solo activas, ordenadas por stock asc', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ total: 0 }]);
    prisma.stockMovement.findMany.mockResolvedValue([]);

    await service.getSummary();

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, stock: { lte: 'stockMin' } },
      orderBy: { stock: 'asc' },
      select: expectedAlertSelect,
    });
  });

  it('devuelve lista de alertas vacía cuando no hay productos bajo el mínimo', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ total: 0 }]);
    prisma.stockMovement.findMany.mockResolvedValue([]);

    const result = await service.getSummary();

    expect(result.alerts).toEqual([]);
  });

  it('convierte el valor de inventario a number y usa 0 si no hay filas', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ total: '2500.50' }]);
    prisma.stockMovement.findMany.mockResolvedValue([]);

    const withValue = await service.getSummary();
    expect(withValue.totalInventoryValue).toBe(2500.5);

    prisma.$queryRaw.mockResolvedValue([]);
    const empty = await service.getSummary();
    expect(empty.totalInventoryValue).toBe(0);
  });

  it('resuelve producto y usuario en los movimientos recientes', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ total: 0 }]);
    prisma.stockMovement.findMany.mockResolvedValue([movement]);

    const result = await service.getSummary();

    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith({
      take: 10,
      orderBy: { date: 'desc' },
      select: expectedMovementSelect,
    });
    expect(result.recentMovements[0].product.name).toBe('Martillo');
    expect(result.recentMovements[0].user.email).toBe('admin@ferreteria.local');
  });

  it('ejecuta las tres queries en paralelo', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ total: 0 }]);
    prisma.stockMovement.findMany.mockResolvedValue([]);

    await service.getSummary();

    expect(prisma.product.findMany).toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.stockMovement.findMany).toHaveBeenCalled();
  });
});
