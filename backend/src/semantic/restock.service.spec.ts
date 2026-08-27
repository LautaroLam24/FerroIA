import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RestockService } from './restock.service';
import { SemanticIndexService } from './semantic-index.service';

describe('RestockService', () => {
  let service: RestockService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      fields: { stockMin: 'stockMin' };
    };
    stockMovement: { groupBy: jest.Mock };
  };
  let semanticIndexService: { summarizeRestock: jest.Mock };

  const supplierA = { id: 'sup-1', name: 'Proveedor A' };
  const supplierB = { id: 'sup-2', name: 'Proveedor B' };

  const productWithHistory = {
    id: 'prod-1',
    code: 'PIN-100',
    name: 'Látex Interior Blanco 20L',
    stock: 2,
    stockMin: 10,
    supplier: supplierA,
  };

  const productWithoutHistory = {
    id: 'prod-2',
    code: 'CLA-050',
    name: 'Clavos 2 pulgadas',
    stock: 5,
    stockMin: 6,
    supplier: supplierB,
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        fields: { stockMin: 'stockMin' },
      },
      stockMovement: { groupBy: jest.fn() },
    };
    semanticIndexService = { summarizeRestock: jest.fn() };

    const configValues: Record<string, string> = {
      RESTOCK_PERIOD_DAYS: '30',
      RESTOCK_LEAD_DAYS: '15',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestockService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => configValues[key] },
        },
        { provide: SemanticIndexService, useValue: semanticIndexService },
      ],
    }).compile();

    service = module.get<RestockService>(RestockService);
  });

  it('sin productos bajo mínimo devuelve respuesta vacía informativa sin llamar al LLM', async () => {
    prisma.product.findMany.mockResolvedValue([]);

    const result = await service.suggest();

    expect(result.totalProducts).toBe(0);
    expect(result.groups).toEqual([]);
    expect(result.summary).toBeTruthy();
    expect(semanticIndexService.summarizeRestock).not.toHaveBeenCalled();
  });

  it('calcula la cantidad sugerida a partir del consumo promedio y agrupa por proveedor', async () => {
    prisma.product.findMany.mockResolvedValue([
      productWithHistory,
      productWithoutHistory,
    ]);
    prisma.stockMovement.groupBy.mockResolvedValue([
      { productId: 'prod-1', _sum: { quantity: 60 } },
    ]);
    semanticIndexService.summarizeRestock.mockResolvedValue(
      'Hay 2 productos a reponer en 2 proveedores.',
    );

    const result = await service.suggest();

    expect(result.totalProducts).toBe(2);
    expect(result.groups).toHaveLength(2);

    const groupA = result.groups.find((g) => g.supplierId === 'sup-1');
    const groupB = result.groups.find((g) => g.supplierId === 'sup-2');

    // avgDaily = 60/30 = 2; suggested = ceil(2*15) = 30 (mayor que stockMin-stock=8)
    expect(groupA?.items[0].suggestedQuantity).toBe(30);
    // sin historial: cae al mínimo para llegar a stockMin (6-5=1)
    expect(groupB?.items[0].suggestedQuantity).toBe(1);

    expect(result.summary).toBe('Hay 2 productos a reponer en 2 proveedores.');
  });

  it('la cantidad sugerida siempre es mayor a 0', async () => {
    prisma.product.findMany.mockResolvedValue([
      { ...productWithoutHistory, stock: 6, stockMin: 6 },
    ]);
    prisma.stockMovement.groupBy.mockResolvedValue([]);
    semanticIndexService.summarizeRestock.mockResolvedValue('resumen');

    const result = await service.suggest();

    expect(result.groups[0].items[0].suggestedQuantity).toBeGreaterThan(0);
  });

  it('si falla la redacción del LLM, arma un resumen de respaldo y responde igual', async () => {
    prisma.product.findMany.mockResolvedValue([productWithHistory]);
    prisma.stockMovement.groupBy.mockResolvedValue([]);
    semanticIndexService.summarizeRestock.mockRejectedValue(
      new Error('connect ECONNREFUSED'),
    );

    const result = await service.suggest();

    expect(result.groups).toHaveLength(1);
    expect(result.summary).toContain('1');
  });
});
