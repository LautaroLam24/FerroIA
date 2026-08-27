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

interface RestockItem {
  productId: string;
  code: string;
  name: string;
  currentStock: number;
  stockMin: number;
  suggestedQuantity: number;
}

interface RestockGroup {
  supplierId: string;
  supplierName: string;
  items: RestockItem[];
}

interface RestockResponseBody {
  data: { totalProducts: number; groups: RestockGroup[]; summary: string };
}

// Nota: el endpoint no filtra por datos propios (calcula sobre todo el
// catálogo activo bajo mínimo), así que estos tests buscan sus propios
// productos por código dentro de la respuesta en vez de asumir que la
// respuesta global está vacía o tiene un tamaño exacto (la DB de dev es
// compartida entre suites, ver Decisiones en ESTADO.md).
describe('Restock suggestion (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;
  let categoryId: string;
  let supplierId: string;
  let adminUserId: string;

  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  const adminEmail = 'e2e-restock-admin@ferreteria.local';
  const operarioEmail = 'e2e-restock-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeCode(prefix: string): string {
    return `e2e-restock-${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
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
        name: 'E2E Restock Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Restock Operario',
        passwordHash,
        role: Role.OPERARIO,
      },
    });
    adminUserId = admin.id;

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
      where: { product: { code: { startsWith: 'e2e-restock-' } } },
    });
    await prisma.product.deleteMany({
      where: { code: { startsWith: 'e2e-restock-' } },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-restock-' } },
    });
    await app.close();
  });

  beforeEach(() => {
    fetchMock = jest.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/restock/summary')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ summary: 'Resumen de reposición de prueba.' }),
        });
      }
      // Llamadas del listener de indexación disparadas por el alta de productos
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ indexed: 1 }),
      });
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  async function createLowStockProduct(
    codeSuffix: string,
    stock: number,
    stockMin: number,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Producto ${codeSuffix}`,
        code: makeCode(codeSuffix),
        price: 100,
        stock,
        stockMin,
        categoryId,
        supplierId,
      })
      .expect(201);
    return (response.body as { data: { id: string; code: string } }).data;
  }

  it('agrupa por proveedor y calcula cantidades por código, con resumen del LLM', async () => {
    const product = await createLowStockProduct('con-historial', 2, 10);
    await prisma.stockMovement.create({
      data: {
        type: StockMovementType.VENTA,
        quantity: 60,
        productId: product.id,
        userId: adminUserId,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/restock/suggest')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = (response.body as RestockResponseBody).data;
    const group = body.groups.find((g) => g.supplierId === supplierId);
    expect(group).toBeDefined();
    const item = group?.items.find((i) => i.code === product.code);
    expect(item).toBeDefined();
    expect(item?.suggestedQuantity).toBeGreaterThan(0);
    expect(body.summary).toBeTruthy();
  });

  it('producto bajo mínimo sin historial de ventas igual se sugiere (mínimo para llegar a stockMin)', async () => {
    const product = await createLowStockProduct('sin-historial', 5, 6);

    const response = await request(app.getHttpServer())
      .post('/api/restock/suggest')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = (response.body as RestockResponseBody).data;
    const group = body.groups.find((g) => g.supplierId === supplierId);
    const item = group?.items.find((i) => i.code === product.code);
    expect(item?.suggestedQuantity).toBe(1);
  });

  it('accesible para ADMIN y OPERARIO', async () => {
    await request(app.getHttpServer())
      .post('/api/restock/suggest')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/restock/suggest')
      .set('Authorization', `Bearer ${operarioToken}`)
      .expect(200);
  });

  it('sin token responde 401', async () => {
    await request(app.getHttpServer()).post('/api/restock/suggest').expect(401);
  });

  it('si falla la redacción del LLM, responde 200 con resumen de respaldo', async () => {
    const product = await createLowStockProduct('fallback-llm', 1, 5);
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/restock/summary')) {
        return Promise.reject(new Error('connect ECONNREFUSED'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ indexed: 1 }),
      });
    });

    const response = await request(app.getHttpServer())
      .post('/api/restock/suggest')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = (response.body as RestockResponseBody).data;
    expect(body.summary).toBeTruthy();
    const group = body.groups.find((g) => g.supplierId === supplierId);
    expect(group?.items.find((i) => i.code === product.code)).toBeDefined();
  });
});
