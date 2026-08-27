import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SemanticIndexListener } from './semantic-index.listener';
import { SemanticIndexService } from './semantic-index.service';

describe('SemanticIndexListener', () => {
  let listener: SemanticIndexListener;
  let prisma: { product: { findUnique: jest.Mock } };
  let semanticIndexService: {
    indexProduct: jest.Mock;
    removeFromIndex: jest.Mock;
  };

  const product = {
    id: 'prod-1',
    code: 'PIN-100',
    name: 'Látex Interior Blanco 20L',
    description: 'Pintura lavable para interior',
    category: { name: 'Pinturas' },
    supplier: { name: 'Proveedor A' },
  };

  beforeEach(async () => {
    prisma = { product: { findUnique: jest.fn() } };
    semanticIndexService = {
      indexProduct: jest.fn(),
      removeFromIndex: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticIndexListener,
        { provide: PrismaService, useValue: prisma },
        { provide: SemanticIndexService, useValue: semanticIndexService },
      ],
    }).compile();

    listener = module.get<SemanticIndexListener>(SemanticIndexListener);
  });

  it('product.created indexa el producto con category/supplier resueltos', async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    semanticIndexService.indexProduct.mockResolvedValue(undefined);

    await listener.onProductCreated({ id: 'prod-1' });

    expect(semanticIndexService.indexProduct).toHaveBeenCalledWith({
      id: 'prod-1',
      code: 'PIN-100',
      name: 'Látex Interior Blanco 20L',
      description: 'Pintura lavable para interior',
      category: 'Pinturas',
      supplier: 'Proveedor A',
    });
  });

  it('product.updated reindexa el producto', async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    semanticIndexService.indexProduct.mockResolvedValue(undefined);

    await listener.onProductUpdated({ id: 'prod-1' });

    expect(semanticIndexService.indexProduct).toHaveBeenCalledTimes(1);
  });

  it('product.deleted quita el producto del índice', async () => {
    semanticIndexService.removeFromIndex.mockResolvedValue(undefined);

    await listener.onProductDeleted({ id: 'prod-1' });

    expect(semanticIndexService.removeFromIndex).toHaveBeenCalledWith('prod-1');
  });

  it('un fallo del servicio Python en product.created no relanza', async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    semanticIndexService.indexProduct.mockRejectedValue(
      new Error('connect ECONNREFUSED'),
    );

    await expect(
      listener.onProductCreated({ id: 'prod-1' }),
    ).resolves.toBeUndefined();
  });

  it('un fallo del servicio Python en product.deleted no relanza', async () => {
    semanticIndexService.removeFromIndex.mockRejectedValue(
      new Error('connect ECONNREFUSED'),
    );

    await expect(
      listener.onProductDeleted({ id: 'prod-1' }),
    ).resolves.toBeUndefined();
  });

  it('si el producto ya no existe en Prisma, no llama al servicio', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await listener.onProductCreated({ id: 'prod-inexistente' });

    expect(semanticIndexService.indexProduct).not.toHaveBeenCalled();
  });
});
