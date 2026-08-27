import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, StockMovementType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface ApiProduct {
  id: string;
  name: string;
  code: string;
  price: string;
  stock: number;
  stockMin: number;
  categoryId: string;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductResponseBody {
  data: ApiProduct;
}

interface ProductsResponseBody {
  data: Array<ApiProduct & { lowStock: boolean }>;
  meta: { total: number; page: number; pageSize: number };
}

interface ErrorResponseBody {
  error: string;
  details?: unknown;
}

describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;
  let categoryId: string;
  let supplierId: string;

  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  const adminEmail = 'e2e-products-admin@ferreteria.local';
  const operarioEmail = 'e2e-products-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeCode(prefix: string): string {
    return `e2e-prod-${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: Role.ADMIN },
      create: {
        email: adminEmail,
        name: 'E2E Products Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Products Operario',
        passwordHash,
        role: Role.OPERARIO,
      },
    });

    adminToken = await jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      role: Role.ADMIN,
    });
    operarioToken = await jwtService.signAsync({
      sub: operario.id,
      email: operario.email,
      role: Role.OPERARIO,
    });

    const category = await prisma.category.create({
      data: { name: makeCode('categoria') },
    });
    const supplier = await prisma.supplier.create({
      data: { name: makeCode('proveedor') },
    });
    categoryId = category.id;
    supplierId = supplier.id;
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({
      where: { product: { code: { startsWith: 'e2e-prod-' } } },
    });
    await prisma.product.deleteMany({
      where: { code: { startsWith: 'e2e-prod-' } },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-products-' } },
    });
    await app.close();
  });

  beforeEach(() => {
    // Cada alta/edición/baja de producto dispara (fire-and-forget) el
    // listener de indexación semántica, que llama al servicio Python vía
    // fetch. Se mockea acá para no depender de que ese servicio esté
    // levantado al correr los tests de productos.
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ indexed: 1 }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  async function waitFor(
    predicate: () => boolean,
    timeoutMs = 2000,
  ): Promise<void> {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timed out waiting for condition');
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  function basePayload(codeSuffix: string) {
    return {
      name: `Producto ${codeSuffix}`,
      code: makeCode(codeSuffix),
      price: 100,
      stock: 10,
      stockMin: 2,
      categoryId,
      supplierId,
    };
  }

  describe('POST /api/products', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .send(basePayload('sin-token'))
        .expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(basePayload('operario'))
        .expect(403);
    });

    it('alta exitosa devuelve 201', async () => {
      const payload = basePayload('alta');
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const product = (response.body as ProductResponseBody).data;
      expect(product.id).toEqual(expect.any(String));
      expect(product.code).toBe(payload.code);
    });

    it('código duplicado devuelve 409', async () => {
      const payload = basePayload('duplicado');
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...payload, name: 'Otro nombre' })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Ya existe un producto con ese código',
      );
    });

    it('categoría inexistente devuelve 400', async () => {
      const payload = basePayload('cat-inexistente');
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...payload,
          categoryId: '11111111-1111-4111-8111-111111111111',
        })
        .expect(400);

      expect((response.body as ErrorResponseBody).error).toBe(
        'La categoría indicada no existe',
      );
    });

    it('proveedor inexistente devuelve 400', async () => {
      const payload = basePayload('sup-inexistente');
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...payload,
          supplierId: '11111111-1111-4111-8111-111111111111',
        })
        .expect(400);

      expect((response.body as ErrorResponseBody).error).toBe(
        'El proveedor indicado no existe',
      );
    });

    it('precio negativo devuelve 400', async () => {
      const payload = basePayload('precio-negativo');
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...payload, price: -1 })
        .expect(400);

      expect((response.body as ErrorResponseBody).details).toEqual(
        expect.any(Array),
      );
    });

    it('campos desconocidos devuelve 400', async () => {
      const payload = basePayload('campos');
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...payload, extra: 'no permitido' })
        .expect(400);
    });
  });

  describe('GET /api/products', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/products').expect(401);
    });

    it('devuelve 200 para rol OPERARIO', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(200);

      const body = response.body as ProductsResponseBody;
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.meta.total).toBe('number');
      expect(body.meta.page).toBe(1);
      expect(body.meta.pageSize).toBe(10);
    });

    it('listado devuelve 200 con lowStock calculado', async () => {
      const payload = { ...basePayload('bajo-stock'), stock: 1, stockMin: 5 };
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/products?code=${payload.code}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as ProductsResponseBody;
      const products = body.data;
      const created = products.find((p) => p.code === payload.code);
      expect(created).toBeDefined();
      expect(created?.lowStock).toBe(true);
    });
  });

  describe('GET /api/products (filtros y paginación)', () => {
    let filterCategoryId: string;
    let filterSupplierId: string;
    let pinturaAzulCode: string;
    let pinturaBlancaCode: string;
    let clavosCode: string;

    beforeEach(async () => {
      const category = await prisma.category.create({
        data: { name: makeCode('filtro-cat') },
      });
      const supplier = await prisma.supplier.create({
        data: { name: makeCode('filtro-sup') },
      });
      filterCategoryId = category.id;
      filterSupplierId = supplier.id;

      const base = {
        price: 100,
        categoryId: filterCategoryId,
        supplierId: filterSupplierId,
      };

      const pinturaAzul = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...base,
          name: 'Pintura Latex Azul',
          code: makeCode('pintura-azul'),
          stock: 50,
          stockMin: 10,
        })
        .expect(201);
      const pinturaBlanca = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...base,
          name: 'pintura latex blanca',
          code: makeCode('pintura-blanca'),
          stock: 3,
          stockMin: 10,
        })
        .expect(201);
      const clavos = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...base,
          name: 'Clavos 2 pulgadas',
          code: makeCode('clavos'),
          stock: 20,
          stockMin: 5,
        })
        .expect(201);

      pinturaAzulCode = (pinturaAzul.body as ProductResponseBody).data.code;
      pinturaBlancaCode = (pinturaBlanca.body as ProductResponseBody).data.code;
      clavosCode = (clavos.body as ProductResponseBody).data.code;
    });

    afterEach(async () => {
      await prisma.stockMovement.deleteMany({
        where: { product: { categoryId: filterCategoryId } },
      });
      await prisma.product.deleteMany({
        where: { categoryId: filterCategoryId },
      });
      await prisma.category.deleteMany({ where: { id: filterCategoryId } });
      await prisma.supplier.deleteMany({ where: { id: filterSupplierId } });
    });

    async function get(path: string) {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      return response.body as ProductsResponseBody;
    }

    it('filtra por name (contiene, case-insensitive)', async () => {
      const body = await get('/api/products?name=pintura&pageSize=100');

      expect(body.meta.total).toBeGreaterThanOrEqual(2);
      const codes = body.data.map((p) => p.code);
      expect(codes).toContain(pinturaAzulCode);
      expect(codes).toContain(pinturaBlancaCode);
      expect(codes).not.toContain(clavosCode);
    });

    it('filtra por code exacto', async () => {
      const body = await get(`/api/products?code=${pinturaAzulCode}`);

      expect(body.meta.total).toBe(1);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].code).toBe(pinturaAzulCode);
    });

    it('filtra por categoryId', async () => {
      const body = await get(
        `/api/products?categoryId=${filterCategoryId}&pageSize=100`,
      );

      expect(body.meta.total).toBe(3);
      expect(body.data.every((p) => p.categoryId === filterCategoryId)).toBe(
        true,
      );
    });

    it('filtra por supplierId', async () => {
      const body = await get(
        `/api/products?supplierId=${filterSupplierId}&pageSize=100`,
      );

      expect(body.meta.total).toBe(3);
      expect(body.data.every((p) => p.supplierId === filterSupplierId)).toBe(
        true,
      );
    });

    it('filtra por lowStock=true', async () => {
      const body = await get('/api/products?lowStock=true&pageSize=100');

      const codes = body.data.map((p) => p.code);
      expect(codes).toContain(pinturaBlancaCode);
      expect(codes).not.toContain(pinturaAzulCode);
      expect(body.data.every((p) => p.lowStock === true)).toBe(true);
    });

    it('combina dos filtros', async () => {
      const body = await get('/api/products?name=pintura&lowStock=true');

      expect(body.meta.total).toBe(1);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].code).toBe(pinturaBlancaCode);
    });

    it('búsqueda sin resultados devuelve 200 con data vacía y meta.total 0', async () => {
      const body = await get('/api/products?name=no-existe-este-producto');

      expect(body.data).toEqual([]);
      expect(body.meta).toEqual({ total: 0, page: 1, pageSize: 10 });
    });

    it('paginación devuelve meta correcta', async () => {
      const body = await get(
        `/api/products?categoryId=${filterCategoryId}&page=2&pageSize=2`,
      );

      expect(body.meta).toEqual({ total: 3, page: 2, pageSize: 2 });
      expect(body.data).toHaveLength(1);
    });

    it('lowStock distinto de true devuelve 400', async () => {
      await request(app.getHttpServer())
        .get('/api/products?lowStock=yes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('paginación inválida devuelve 400', async () => {
      for (const path of [
        '/api/products?page=0',
        '/api/products?page=abc',
        '/api/products?pageSize=0',
        '/api/products?pageSize=101',
        '/api/products?pageSize=abc',
      ]) {
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      }
    });

    it('parámetro desconocido devuelve 400', async () => {
      await request(app.getHttpServer())
        .get('/api/products?desconocido=x')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/products/:id', () => {
    it('edición exitosa devuelve 200', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basePayload('edicion'))
        .expect(201);
      const createdId = (created.body as ProductResponseBody).data.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/products/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 250 })
        .expect(200);

      expect((response.body as ProductResponseBody).data.price).toBe('250');
    });

    it('producto inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .patch('/api/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 10 })
        .expect(404);
    });

    it('código duplicado al editar devuelve 409', async () => {
      const a = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basePayload('dup-a'))
        .expect(201);
      const b = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basePayload('dup-b'))
        .expect(201);
      const aId = (a.body as ProductResponseBody).data.id;
      const bCode = (b.body as ProductResponseBody).data.code;

      const response = await request(app.getHttpServer())
        .patch(`/api/products/${aId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: bCode })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Ya existe un producto con ese código',
      );
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('baja exitosa devuelve 204, desaparece del listado y conserva sus movimientos', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basePayload('baja'))
        .expect(201);
      const createdId = (created.body as ProductResponseBody).data.id;
      const createdCode = (created.body as ProductResponseBody).data.code;

      const admin = await prisma.user.findUniqueOrThrow({
        where: { email: adminEmail },
      });
      const movement = await prisma.stockMovement.create({
        data: {
          type: StockMovementType.ENTRADA,
          quantity: 5,
          productId: createdId,
          userId: admin.id,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/products/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const listResponse = await request(app.getHttpServer())
        .get(`/api/products?code=${createdCode}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = listResponse.body as ProductsResponseBody;
      const products = body.data;
      expect(products.find((p) => p.id === createdId)).toBeUndefined();

      const stillExists = await prisma.stockMovement.findUnique({
        where: { id: movement.id },
      });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.quantity).toBe(5);

      const deletedProduct = await prisma.product.findUnique({
        where: { id: createdId },
      });
      expect(deletedProduct?.deletedAt).not.toBeNull();
    });

    it('producto inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .delete('/api/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('baja de producto ya dado de baja devuelve 404', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basePayload('doble-baja'))
        .expect(201);
      const createdId = (created.body as ProductResponseBody).data.id;

      await request(app.getHttpServer())
        .delete(`/api/products/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/products/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer())
        .delete('/api/products/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .delete('/api/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(403);
    });
  });

  describe('description e indexación semántica', () => {
    it('alta con description la devuelve y dispara la indexación', async () => {
      const payload = {
        ...basePayload('con-descripcion'),
        description: 'Pintura lavable para interior',
      };

      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const product = (response.body as ProductResponseBody).data as {
        description?: string;
      };
      expect(product.description).toBe('Pintura lavable para interior');

      await waitFor(() =>
        fetchMock.mock.calls.some(([url]: [string]) =>
          url.includes('/products/index'),
        ),
      );
      const indexCall = fetchMock.mock.calls.find(([url]: [string]) =>
        url.endsWith('/products/index'),
      ) as [string, RequestInit];
      const sentBody = JSON.parse(indexCall[1].body as string) as {
        code: string;
        description: string;
      };
      expect(sentBody.code).toBe(payload.code);
      expect(sentBody.description).toBe('Pintura lavable para interior');
    });

    it('edición de la descripción la refleja en la respuesta', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basePayload('editar-descripcion'))
        .expect(201);
      const createdId = (created.body as ProductResponseBody).data.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/products/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Nueva descripción' })
        .expect(200);

      const product = (response.body as ProductResponseBody).data as {
        description?: string;
      };
      expect(product.description).toBe('Nueva descripción');
    });

    it('la baja lógica dispara la remoción del índice', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(basePayload('baja-indexacion'))
        .expect(201);
      const createdId = (created.body as ProductResponseBody).data.id;

      fetchMock.mockClear();

      await request(app.getHttpServer())
        .delete(`/api/products/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await waitFor(() =>
        fetchMock.mock.calls.some(
          ([url, init]: [string, RequestInit]) =>
            url.includes(`/products/index/${createdId}`) &&
            init.method === 'DELETE',
        ),
      );
    });
  });
});
