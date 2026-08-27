import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SemanticIndexService } from './semantic-index.service';

describe('SemanticIndexService', () => {
  let service: SemanticIndexService;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  const product = {
    id: 'prod-1',
    code: 'PIN-100',
    name: 'Látex Interior Blanco 20L',
    description: 'Pintura lavable para interior',
    category: 'Pinturas',
    supplier: 'Proveedor A',
  };

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const configValues: Record<string, string> = {
      CHATBOT_URL: 'http://localhost:8001',
      CHATBOT_TIMEOUT_MS: '15000',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticIndexService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => configValues[key] },
        },
      ],
    }).compile();

    service = module.get<SemanticIndexService>(SemanticIndexService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('indexProduct hace POST a /products/index con el producto', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await service.indexProduct(product);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/products/index',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(product),
      }),
    );
  });

  it('indexProduct lanza si el servicio responde con error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(service.indexProduct(product)).rejects.toThrow();
  });

  it('removeFromIndex hace DELETE a /products/index/:id', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await service.removeFromIndex('prod-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/products/index/prod-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('search devuelve los resultados ordenados por score', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          results: [
            { id: 'prod-1', score: 0.9 },
            { id: 'prod-2', score: 0.5 },
          ],
        }),
    });

    const results = await service.search('pintura blanca lavable');

    expect(results).toEqual([
      { id: 'prod-1', score: 0.9 },
      { id: 'prod-2', score: 0.5 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/products/search?q=pintura%20blanca%20lavable',
      expect.anything(),
    );
  });

  it('search lanza cuando el servicio no responde', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(service.search('pintura')).rejects.toThrow();
  });

  it('reindexBulk devuelve la cantidad indexada', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ indexed: 3 }),
    });

    const indexed = await service.reindexBulk([product]);

    expect(indexed).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/products/index/bulk',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('summarizeRestock devuelve el resumen redactado', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ summary: 'Hay 2 productos a reponer.' }),
    });

    const summary = await service.summarizeRestock(
      [{ supplierId: 'sup-1', supplierName: 'Proveedor A', items: [] }],
      2,
    );

    expect(summary).toBe('Hay 2 productos a reponer.');
  });
});
